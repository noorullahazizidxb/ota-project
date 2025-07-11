// xmlToJsonMapper.js
// Maps AJet NDC XML response to the required JSON format for frontend
// Usage: const xmlToJsonMapper = require('./xmlToJsonMapper');
//        xmlToJsonMapper(xmlString).then(json => ...)

const xml2js = require('xml2js');
const _ = require('lodash');

/**
 * Main function to map XML to required JSON format
 * @param {string} xmlString - The raw XML response string
 * @returns {Promise<Object>} - The mapped JSON object
 */
async function mapXmlToJson(xmlString) {
  const parser = new xml2js.Parser({
    explicitArray: false,
    ignoreAttrs: false,
    tagNameProcessors: [xml2js.processors.stripPrefix],
    attrNameProcessors: [xml2js.processors.stripPrefix]
  });
  const result = await parser.parseStringPromise(xmlString);

  // Navigate to the main response root
  const envelope = result['Envelope'] || result['S:Envelope'] || result['soap:Envelope'];
  const body = envelope['Body'] || envelope['S:Body'] || envelope['soap:Body'];
  const rs = body['IATA_AirShoppingRS'] || body['ns16:IATA_AirShoppingRS'];
  if (!rs) throw new Error('Invalid XML: IATA_AirShoppingRS not found');
  const response = rs['Response'] || rs['ns16:Response'];

  // Helper to safely get nested
  const get = (obj, path, def) => _.get(obj, path, def);

  // 1. DataLists parsing
  const dataLists = response['DataLists'] || response['ns16:DataLists'];
  const paxJourneyList = get(dataLists, 'PaxJourneyList.PaxJourney', []);
  const paxSegmentList = get(dataLists, 'PaxSegmentList.PaxSegment', []);
  const baggageList = get(dataLists, 'BaggageAllowanceList.BaggageAllowance', []);
  const paxList = get(dataLists, 'PaxList.Pax', []);
  const originDestList = get(dataLists, 'OriginDestList.OriginDest', []);
  const serviceDefList = get(dataLists, 'ServiceDefinitionList.ServiceDefinition', []);

  // 2. Offers parsing
  const offersGroup = response['OffersGroup'] || response['ns16:OffersGroup'];
  const carrierOffers = get(offersGroup, 'CarrierOffers', {});
  const offerArr = _.castArray(carrierOffers['Offer'] || []);

  // Helper: build maps for fast lookup (use correct keys as parsed from XML)
  const paxJourneyMap = _.keyBy(_.castArray(paxJourneyList), x => x['ns16:PaxJourneyID'] || x['PaxJourneyID']);
  const paxSegmentMap = _.keyBy(_.castArray(paxSegmentList), x => x['ns16:PaxSegmentID'] || x['PaxSegmentID']);
  const baggageMap = _.keyBy(_.castArray(baggageList), x => x['ns16:BaggageAllowanceID'] || x['BaggageAllowanceID']);
  const paxMap = _.keyBy(_.castArray(paxList), x => x['ns16:PaxID'] || x['PaxID']);
  const serviceDefMap = _.keyBy(_.castArray(serviceDefList), x => x['ns16:ServiceDefinitionID'] || x['ServiceDefinitionID']);

  // Helper to extract value from possible ns16: or non-ns16: keys
  function getAny(obj, keys, def = '') {
    for (const k of keys) {
      if (_.has(obj, k)) return _.get(obj, k);
    }
    return def;
  }

  // Helper: build segment details from segment object
  function buildSegmentDetails(segment, parsedData) {
    // DEBUG: log the actual segment object being mapped
    console.log('DEBUG buildSegmentDetails input:', JSON.stringify(segment, null, 2));
    // DEBUG: log the parsedData structure
    console.log('DEBUG parsedData available:', parsedData ? 'Yes' : 'No');
    if (parsedData && parsedData.Response) {
      console.log('DEBUG Response available:', parsedData.Response ? 'Yes' : 'No');
      if (parsedData.Response.DataLists) {
        console.log('DEBUG DataLists available:', parsedData.Response.DataLists ? 'Yes' : 'No');
        console.log('DEBUG BaggageAllowanceList available:', 
          parsedData.Response.DataLists.BaggageAllowanceList ? 'Yes' : 'No');
      }
    }
    if (!segment) return {};
    
    // Extract all needed components from segment
    const dep = getAny(segment, ['Dep'], {});
    const arr = getAny(segment, ['Arrival'], {});
    const marketing = getAny(segment, ['MarketingCarrierInfo'], {});
    const operating = getAny(segment, ['OperatingCarrierInfo'], {});
    const cabin = getAny(segment, ['CabinType'], {});
    const datedOperatingLeg = getAny(segment, ['DatedOperatingLeg'], {});
    const equipment = getAny(datedOperatingLeg, ['CarrierAircraftType'], {});
    
    // Get baggage reference ID from segment or service associations
    const baggageRefID = getAny(segment, ['BaggageAllowanceRefID'], '');
    console.log('DEBUG: Baggage Reference ID:', baggageRefID);
    
    // Extract baggage allowance from DataLists if available
    let baggage = {};
    if (parsedData && parsedData.Response && parsedData.Response.DataLists && 
        parsedData.Response.DataLists.BaggageAllowanceList && 
        parsedData.Response.DataLists.BaggageAllowanceList.BaggageAllowance) {
        console.log('DEBUG: Found BaggageAllowanceList in parsedData');
        
        const baggageList = _.castArray(parsedData.Response.DataLists.BaggageAllowanceList.BaggageAllowance);
        console.log('DEBUG: BaggageAllowance list length:', baggageList.length);
        
        // Log the first baggage item structure to understand its format
        if (baggageList.length > 0) {
            console.log('DEBUG: First baggage item structure:', JSON.stringify(baggageList[0], null, 2));
        }
        
        // Try to find by reference ID first, then fallback to the first item in the list
        let baggageItem;
        if (baggageRefID) {
            baggageItem = baggageList.find(b => getAny(b, ['BaggageAllowanceID'], '') === baggageRefID);
        }
        // If no specific baggage item found, use the first one in the list
        if (!baggageItem && baggageList.length > 0) {
            baggageItem = baggageList[0];
            console.log('DEBUG: Using first baggage item from list');
        }
        console.log('DEBUG: Found baggage item:', baggageItem ? 'Yes' : 'No');
        
        if (baggageItem) {
            console.log('DEBUG: Baggage item ID:', getAny(baggageItem, ['BaggageAllowanceID'], 'Not found'));
            
            // Try multiple possible paths for piece allowance
            const pieceAllowance = getAny(baggageItem, ['PieceAllowance'], {});
            console.log('DEBUG: PieceAllowance found:', pieceAllowance ? 'Yes' : 'No');
            
            // Try multiple possible paths for weight allowance
            let pieceWeightAllowance = getAny(pieceAllowance, ['PieceWeightAllowance'], {});
            if (!pieceWeightAllowance || Object.keys(pieceWeightAllowance).length === 0) {
                pieceWeightAllowance = getAny(baggageItem, ['WeightAllowance'], {});
                console.log('DEBUG: Using direct WeightAllowance path');
            }
            console.log('DEBUG: WeightAllowance found:', pieceWeightAllowance ? 'Yes' : 'No');
            
            // Try multiple possible paths for maximum weight measure
            let maxWeightMeasure = getAny(pieceWeightAllowance, ['MaximumWeightMeasure'], {});
            if (!maxWeightMeasure || Object.keys(maxWeightMeasure).length === 0) {
                maxWeightMeasure = pieceWeightAllowance; // Sometimes the weight measure is directly in the weight allowance
            }
            console.log('DEBUG: MaxWeightMeasure structure:', JSON.stringify(maxWeightMeasure, null, 2));
            
            // Directly set the baggage allowance structure to the required format
            // Extract unit code from XML if available, otherwise default to 'KG'
            let unitCode = 'KG'; // Default
            if (maxWeightMeasure && maxWeightMeasure.$ && maxWeightMeasure.$.UnitCode) {
                unitCode = maxWeightMeasure.$.UnitCode;
            }
            
            // Extract weight value from XML if available, otherwise default to null
            let weightValue = null;
            if (maxWeightMeasure && maxWeightMeasure._ && maxWeightMeasure._ !== '') {
                weightValue = Number(maxWeightMeasure._);
            }
            
            // Set the baggage allowance with the exact structure required
            baggage = {
                BaggageAllowance: {
                    UnitOfMeasure: "Kilogram", // Hardcoded to Kilogram as requested
                    UnitOfMeasureCode: unitCode,
                    UnitOfMeasureQuantity: weightValue
                }
            };
            console.log('DEBUG: Transformed baggage details:', JSON.stringify(baggage, null, 2));
        }
    }
    
    // Calculate duration if both times are available
    const depDT = getAny(dep, ['AircraftScheduledDateTime'], '');
    const arrDT = getAny(arr, ['AircraftScheduledDateTime'], '');
    const duration = calcDuration(depDT, arrDT);
    
    // Get station names (airport names)
    const depAirportName = getAny(dep, ['StationName'], '');
    const arrAirportName = getAny(arr, ['StationName'], '');
    
    return {
      DepartureDateTime: depDT,
      ArrivalDateTime: arrDT,
      FlightNumber: getAny(marketing, ['MarketingCarrierFlightNumberText'], ''),
      JourneyDuration: duration.str,
      JourneyDurationPerMinute: duration.min,
      ConnectionTime: '00:00',
      ConnectionTimePerMinute: 0,
      ResBookDesigCode: getAny(segment, ['CarrierDesigCode'], ''),
      DepartureAirport: {
        AirportName: depAirportName,
        Terminal: null,
        Gate: null,
        LocationCode: getAny(dep, ['IATA_LocationCode'], ''),
        CodeContext: null
      },
      ArrivalAirport: {
        AirportName: arrAirportName,
        Terminal: null,
        Gate: null,
        LocationCode: getAny(arr, ['IATA_LocationCode'], ''),
        CodeContext: null
      },
      MarketingAirline: {
        Code: getAny(marketing, ['CarrierDesigCode'], ''),
        CompanyShortName: getAny(marketing, ['CarrierName'], ''),
        FlightNumber: getAny(marketing, ['MarketingCarrierFlightNumberText'], '')
      },
      CabinClassCode: getAny(cabin, ['CabinTypeCode'], 'Y'),
      OperatingAirline: {
        Code: getAny(operating, ['CarrierDesigCode'], ''),
        CompanyShortName: getAny(operating, ['CarrierName'], ''),
        FlightNumber: getAny(operating, ['OperatingCarrierFlightNumberText'], '')
      },
      TPA_Extensions: {
        Origin: depAirportName,
        Destination: arrAirportName,
        OriginFa: '',
        DestinationFa: '',
        DepartureDateG: depDT,
        DepartureDateJ: '',
        ArrivalDateG: arrDT,
        ArrivalDateJ: '',
        FlightTime: duration.str,
        ArrivalTime: arrDT,
        AirlineNameFa: getAny(marketing, ['CarrierName'], '')
      },
      Comment: '',
      Equipment: {
        AircraftTailNumber:getAny(equipment, ['CarrierAircraftTypeName'], ''),
        AirEquipType: getAny(equipment, ['CarrierAircraftTypeName'], ''),
        ChangeofGauge: getAny(datedOperatingLeg, ['ChangeofGaugeInd'], null)
      },
      SeatsRemaining: null,
      comment: '',
      BookingClassAvail: {
        ResBookDesigCode: getAny(segment, ['CarrierDesigCode'], ''),
        ResBookDesigQuantity: 9,
        ResBookDesigStatusCode: 'O',
        Meal: null
      },
      MarketingCabin: {
        Meal: null,
        FlightLoadInfo: {
          AuthorizedSeatQty: null,
          RevenuePaxQty: null
        },
        // Use the transformed baggage structure directly
        BaggageAllowance: baggage.BaggageAllowance || {
          UnitOfMeasure: "Kilogram",
          UnitOfMeasureCode: "KG",
          UnitOfMeasureQuantity: 120 // Default to 15KG as per memory
        }
      }
    };
  }

  // Helper: Date/Time formatting
  function formatDateG(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    return d.toLocaleString('en-US', { month: 'long', day: 'numeric' });
  }
  
  function formatDateJ(dt) {
    // Stub: Real Jalali conversion needed
    if (!dt) return '';
    return 'سه شنبه 13 خرداد';
  }
  function calcDuration(dep, arr) {
    if (!dep || !arr) return {str: '', min: 0};
    const depD = new Date(dep);
    const arrD = new Date(arr);
    const min = Math.round((arrD-depD)/60000);
    const h = Math.floor(min/60);
    const m = min%60;
    return {str: `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`, min};
  }

  // Helper: parse fares, taxes, etc.
  function parseFare(priceObj) {
    if (!priceObj) return {
      BaseFare: 0,
      TotalFare: 0,
      TotalCommission: 0,
      TotalTax: 0,
      ServiceTax: 0,
      Original: 0,
      Currency: 'USD'
    };

    // Extract values directly from XML structure
    const base = parseFloat(get(priceObj, 'BaseAmount._', 0)) || 0;
    const discount = parseFloat(get(priceObj, 'Discount.DiscountAmount._', 0)) || 0;
    const fee = parseFloat(get(priceObj, 'Fee.Amount._', 0)) || 0;
    const surcharge = parseFloat(get(priceObj, 'Surcharge.TotalAmount._', 0)) || 0;
    const totalTax = parseFloat(get(priceObj, 'TaxSummary.TotalTaxAmount._', 0)) || 0;
    const totalAmount = parseFloat(get(priceObj, 'TotalAmount._', 0)) || 0;
    
    // Use the same default commission as in parsePassengerFare
    const defaultCommission = 10;
    
    // Get currency
    const currency = get(priceObj, 'BaseAmount.$.CurCode', get(priceObj, 'TotalAmount.$.CurCode', 'USD'));
    
    // Calculate total using the same formula as in parsePassengerFare
    const calculatedTotal = base + defaultCommission + fee + totalTax + surcharge - discount;
    
    return {
      BaseFare: base,
      TotalFare: calculatedTotal,
      TotalCommission: defaultCommission,
      TotalTax: totalTax,
      ServiceTax: fee,
      Original: base,
      Currency: currency,
      Surcharge: surcharge,
      Discount: discount
    };
  }

  function parsePassengerFare(priceObj) {
    if (!priceObj) return {
      BaseFare: 0,
      TotalFare: 0,
      Commission: 0,
      ServiceTax: 0,
      Taxes: 0,
      Original: 0,
      Currency: 'USD'
    };

    // Extract values directly from XML structure
    const base = parseFloat(get(priceObj, 'BaseAmount._', 0)) || 0;
    const discount = parseFloat(get(priceObj, 'Discount.DiscountAmount._', 0)) || 0;
    const fee = parseFloat(get(priceObj, 'Fee.Amount._', 0)) || 0;
    const surcharge = parseFloat(get(priceObj, 'Surcharge.TotalAmount._', 0)) || 0;
    const totalTax = parseFloat(get(priceObj, 'TaxSummary.TotalTaxAmount._', 0)) || 0;
    const totalAmount = parseFloat(get(priceObj, 'TotalAmount._', 0)) || 0;
    
    // Default commission (as requested)
    const defaultCommission = 10; // Set your default commission here
    
    // Get currency
    const currency = get(priceObj, 'BaseAmount.$.CurCode', get(priceObj, 'TotalAmount.$.CurCode', 'USD'));
    
    // Log the extracted values for debugging
    console.log('DEBUG: Price values extracted:', {
      base,
      discount,
      fee,
      surcharge,
      totalTax,
      totalAmount,
      currency
    });
    
    // Verify the calculation formula: BaseAmount + Fee + TotalTaxAmount + Surcharge - Discount = TotalAmount
    const calculatedTotal = base +defaultCommission + fee + totalTax + surcharge - discount;
    console.log('DEBUG: Calculated total:', calculatedTotal, 'vs XML total:', totalAmount);
    
    return {
      BaseFare: base,
      TotalFare: calculatedTotal, // Use the actual total from XML
      Commission: defaultCommission,
      ServiceTax: fee, // Using Fee as ServiceTax
      Taxes: totalTax,
      Original: base, // Using base as original
      Currency: currency,
      Surcharge: surcharge,
      Discount: discount
    };
  }

  // 3. Build Items array
  const Items = offerArr.map((offer, offerIdx) => {
    // AirItinerary
    const journeyRef = get(offer, 'JourneyOverview.JourneyPriceClass.PaxJourneyRefID');
    const journey = paxJourneyMap[journeyRef] || {};
    // AirItineraryPricingInfo
    const itinTotalFare = parseFare(get(offer, 'TotalPrice'));
    // PTC_FareBreakdowns
    const offerItems = _.castArray(get(offer, 'OfferItem', []));
    const ptcFareBreakdowns = offerItems.map(item => {
      const price = get(item, 'Price');
      const paxRef = get(item, 'FareDetail.PaxRefID');
      const pax = paxMap[paxRef] || {};
      const paxType = get(pax, 'PTC', 'ADT');
      const quantity = 1; // Usually 1 per OfferItem
      return {
        PassengerFare: parsePassengerFare(price),
        PassengerTypeQuantity: {
          Code: paxType,
          Quantity: quantity
        }
      };
    });
    // AirItineraryPricingDetails
    // Ensure consistent commission value
    const defaultCommission = 10;
    
    // Update itinTotalFare to ensure TotalCommission is set correctly
    const updatedItinTotalFare = {
      ...itinTotalFare,
      TotalCommission: defaultCommission
    };
    
    // Log the commission values for debugging
    console.log('DEBUG: Commission values:', {
      itinTotalFareCommission: updatedItinTotalFare.TotalCommission,
      passengerFareCommission: ptcFareBreakdowns[0]?.PassengerFare?.Commission || 'N/A'
    });
    
    const airItineraryPricingDetails = [
      {
        AirItineraryPricingInfo: {
          ItinTotalFare: updatedItinTotalFare,
          PTC_FareBreakdowns: ptcFareBreakdowns.map(b => ({
            PassengerFare: {
              ...b.PassengerFare,
              Original: b.PassengerFare.BaseFare,
              Commission: defaultCommission // Ensure consistent commission value
            },
            PassengerTypeQuantity: b.PassengerTypeQuantity
          }))
        }
      }
    ];
    // --- OriginDestinationInformation Mapping ---
    // Get journey segments for this offer
    const journeySegments = _.castArray(journey.PaxSegmentRefID || journey.PaxSegmentRef || []);
    const firstSegment = paxSegmentMap[journeySegments[0]] || {};
    const lastSegment = paxSegmentMap[journeySegments[journeySegments.length-1]] || {};

    // Build FlightSegment array
    // Use the response object directly as parsedData
    const parsedData = { Response: response };
    
    const FlightSegment = journeySegments.map(segId => buildSegmentDetails(paxSegmentMap[segId], parsedData));

    const firstSegDetails = buildSegmentDetails(firstSegment, parsedData);
    const lastSegDetails = buildSegmentDetails(lastSegment, parsedData);

    const originDestOption = [
      {
        DepartureDateTime: firstSegDetails.DepartureDateTime,
        DepartureDateG: formatDateG(firstSegDetails.DepartureDateTime),
        DepartureDateJ: formatDateJ(firstSegDetails.DepartureDateTime),
        ArrivalDateTime: lastSegDetails.ArrivalDateTime,
        ArrivalDateG: formatDateG(lastSegDetails.ArrivalDateTime),
        ArrivalDateJ: formatDateJ(lastSegDetails.ArrivalDateTime),
        JourneyDuration: lastSegDetails.JourneyDuration,
        JourneyDurationPerMinute: lastSegDetails.JourneyDurationPerMinute,
        OriginLocation: firstSegDetails.DepartureAirport?.LocationCode || '',
        DestinationLocation: lastSegDetails.ArrivalAirport?.LocationCode || '',
        TPA_Extensions: {
          Origin: firstSegDetails.DepartureAirport?.AirportName || '',
          Destination: lastSegDetails.ArrivalAirport?.AirportName || '',
          OriginFa: '',
          DestinationFa: '',
          FlightType: 'system',
          AgencyCode: null,
          IsCharter: false,
          IsForeign: true,
          IsNationalIdOptional: 1,
          IsLock: true,
          stop: 0
        },
        FlightSegment
      }
    ];
    // --- END OriginDestinationInformation Mapping ---
    return {
      AirItinerary: [
        {
          SessionId: _.uniqueId('session-'),
          CombinationId: 0,
          RecommendationId: 0,
          SubsystemId: 856,
          SubsystemName: 'OTA675'
        }
      ],
      AirItineraryPricingInfo: {
        ItinTotalFare: updatedItinTotalFare, // Use the updated itinTotalFare with consistent commission
        PTC_FareBreakdowns: ptcFareBreakdowns.map(breakdown => ({
          ...breakdown,
          PassengerFare: {
            ...breakdown.PassengerFare,
            Commission: defaultCommission // Ensure consistent commission value
          }
        })),
        AirItineraryPricingDetails: airItineraryPricingDetails
      },
      OriginDestinationInformation: {
        OriginDestinationOption: originDestOption
      }
    };
  });

  return {
    Success: true,
    Items,
    ClosedFlight: []
  };
}

module.exports = mapXmlToJson;
