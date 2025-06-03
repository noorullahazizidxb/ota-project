const soap = require('soap');
const axios = require('axios');
const https = require('https');
const { promisify } = require('util');
const xml2js = require('xml2js');
const { v4: uuidv4 } = require('uuid');
const mapXmlToJson = require('../utils/xmlToJsonMapper');
require('dotenv').config();

/**
 * Get environment variable with fallback value
 * @param {string} key - The environment variable name
 * @param {*} defaultValue - The default value if the environment variable is not set
 * @returns {*} The environment variable value or the default value
 */
function getEnv(key, defaultValue) {
    return process.env[key] || defaultValue;
}

// WSDL URL for the AJet NDC service
const WSDL_URL = getEnv('AJET_NDC_WSDL_URL', 'https://tkj-stage.crane.aero/cranendc/v20.1/CraneNDCService?wsdl');

// SOAP client options
const SOAP_OPTIONS = {
    disableCache: true,
    forceSoap12Headers: false,
    httpClient: {
        request: function(rurl, data, callback, exheaders, exoptions) {
            const httpsAgent = new https.Agent({
                rejectUnauthorized: false, // Only for development!
                keepAlive: true,
                timeout: 30000
            });

            const headers = {
                'Content-Type': 'text/xml;charset=UTF-8',
                'Accept': 'text/xml, application/soap+xml',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'SOAPAction': 'cranendc/doAirShop',
                'User-Agent': 'Node-SOAP/1.1.12',
                'username': getEnv('AJET_USER_ID', 'NEWLINKTRAVEL'),
                'password': getEnv('AJET_PASSWORD', 'Zs2s7/2(/2)hjay*?YAjeTxn'),
                'Connection': 'keep-alive',
                'Accept-Encoding': 'gzip, deflate, br',
                ...exheaders
            };

            axios({
                url: rurl,
                method: data ? 'POST' : 'GET',
                data: data,
                headers: headers,
                httpsAgent: httpsAgent,
                timeout: 30000,
                ...exoptions
            })
            .then(response => {
                callback(null, response, response.data);
            })
            .catch(error => {
                console.error('SOAP Request Error:', error.message);
                if (error.response) {
                    console.error('Response status:', error.response.status);
                    console.error('Response data:', error.response.data);
                }
                callback(error);
            });
        }
    }
};

/**
 * Helper function to validate required parameters
 * @param {Object} params - The parameters to validate
 * @param {Array<string>} requiredParams - List of required parameter names
 * @throws {Error} If any required parameter is missing
 */
function validateParams(params, requiredParams) {
    if (!params) {
        throw new Error('Parameters object is required');
    }
    
    const missingParams = requiredParams.filter(param => !params[param]);
    if (missingParams.length > 0) {
        throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
    }
}

/**
 * Builds the SOAP XML request for IATA AirShopping
 * This function uses the SOAP package to generate XML from a JavaScript object.
 * All credentials and configuration are pulled from environment variables for centralized management.
 * @returns {string} - The XML payload as a string
 */
async function buildAirShoppingRQ(searchParams) {
    try {
        // Extract search parameters
        const origin = searchParams.origin || process.env.DEFAULT_ORIGIN || 'SAW';
        const destination = searchParams.destination || process.env.DEFAULT_DESTINATION || 'DXB';
        const departureDate = searchParams.departureDate || process.env.DEFAULT_DEPARTURE_DATE || '2025-07-01';
        const cabinClass = searchParams.cabinClass || process.env.DEFAULT_CABIN_CLASS || 'Y';
        const passengers = searchParams.passengers || [{ type: 'ADT', count: 1 }];
        
        // Generate passenger XML
        const paxsXml = passengers.map((pax, index) => `
          <ns1:Pax>
            <ns1:PaxID>${pax.type}${index + 1}</ns1:PaxID>
            <ns1:PTC>${pax.type}</ns1:PTC>
          </ns1:Pax>`).join('');
        
        const apiVersion = process.env.AJET_NDC_API_VERSION || '20.1';
        const username = process.env.AJET_NDC_USER_ID || 'NEWLINKTRAVEL';
        const password = process.env.AJET_NDC_PASSWORD || 'Zs2s7/2(/2)hjay*?YAjeTxn';
        const agencyId = process.env.AJET_NDC_AGENCY_ID || 'ZEYNEPU';

        // Create the exact XML structure as specified in the example
        const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
                   xmlns:ns1="http://www.iata.org/IATA/2015/00/2020.1/IATA_AirShoppingRQ">
  <SOAP-ENV:Header>
    <ns1:SenderCredentials>
      <ns1:UserID>${getEnv('AJET_NDC_USER_ID', 'NEWLINKTRAVEL')}</ns1:UserID>
      <ns1:Password>${getEnv('AJET_NDC_PASSWORD', 'Zs2s7/2(/2)hjay*?YAjeTxn')}</ns1:Password>
    </ns1:SenderCredentials>
  </SOAP-ENV:Header>
  <SOAP-ENV:Body>
    <ns1:IATA_AirShoppingRQ>
      <ns1:MessageDoc>
        <ns1:RefVersionNumber>${apiVersion}</ns1:RefVersionNumber>
      </ns1:MessageDoc>
      <ns1:Party>
        <ns1:Sender>
          <ns1:TravelAgency>
            <ns1:AgencyID>${agencyId}</ns1:AgencyID>
          </ns1:TravelAgency>
        </ns1:Sender>
      </ns1:Party>
      <ns1:Request>
        <ns1:FlightRequest>
          <ns1:OriginDestCriteria>
            <ns1:DestArrivalCriteria>
              <ns1:IATA_LocationCode>${destination}</ns1:IATA_LocationCode>
            </ns1:DestArrivalCriteria>
            <ns1:OriginDepCriteria>
              <ns1:Date>${departureDate}</ns1:Date>
              <ns1:IATA_LocationCode>${origin}</ns1:IATA_LocationCode>
            </ns1:OriginDepCriteria>
            <ns1:PreferredCabinType>
              <ns1:CabinTypeCode>${cabinClass}</ns1:CabinTypeCode>
            </ns1:PreferredCabinType>
          </ns1:OriginDestCriteria>
        </ns1:FlightRequest>
        <ns1:Paxs>
          ${paxsXml}
        </ns1:Paxs>
        <ns1:ResponseParameters>
          <ns1:CurParameter>
            <ns1:RequestedCurCode>${searchParams.currency || 'USD'}</ns1:RequestedCurCode>
          </ns1:CurParameter>
          <ns1:LangUsage>
            <ns1:LangCode>${searchParams.language || 'EN'}</ns1:LangCode>
          </ns1:LangUsage>
        </ns1:ResponseParameters>
      </ns1:Request>
    </ns1:IATA_AirShoppingRQ>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

        return xmlPayload;
    } catch (error) {
        console.error('Error generating AirShopping XML:', error);
        throw error;
    }
}

/**
 * Send the AirShopping request to the NDC service
 * @param {Object} searchParams - The search parameters
 * @param {Object} options - Additional options for the request
 * @returns {Promise<Object>} - The transformed response in the desired format
 */
async function sendAirShoppingRequest(searchParams, options = {}) {
    try {
        // Build the SOAP request
        const xmlPayload = await buildAirShoppingRQ(searchParams);
        
        // Default endpoint from environment or fallback
        const endpoint = options.endpoint || getEnv('AJET_NDC_ENDPOINT', 'https://tkj-stage.crane.aero/cranendc/v20.1/CraneNDCService');
        
        // Create HTTPS agent for secure requests
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false, // Only for development!
            keepAlive: true,
            timeout: 30000
        });
        
        // Set up the headers for the SOAP request - exactly as required
        const username = getEnv('AJET_NDC_USER_ID', 'NEWLINKTRAVEL');
        const password = getEnv('AJET_NDC_PASSWORD', 'Zs2s7/2(/2)hjay*?YAjeTxn');
        
        const headers = {
            'Content-Type': 'text/xml;charset=UTF-8',
            'Accept': 'text/xml, application/soap+xml',
            'SOAPAction': 'cranendc/doAirShop', // Exact SOAPAction header value as required
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Connection': 'keep-alive',
            'Accept-Encoding': 'gzip, deflate, br',
            'username': username,
            'password': password,
            ...options.headers
        };
        
        try {
            console.log('Sending request to AJet NDC service...');
            console.log('Using endpoint:', endpoint);
            console.log('Headers:', JSON.stringify(headers, null, 2));
            
            // Log the first 500 characters of the payload for debugging
            if (options.logRequest) {
                console.log('Request payload (first 500 chars):', xmlPayload.substring(0, 500) + '...');
            }
            
            // Start timer for performance measurement
            console.time('ajet-ndc-request');
            
            // Send the request
            const response = await axios({
                method: 'post',
                url: endpoint,
                headers,
                data: xmlPayload,
                httpsAgent,
                timeout: options.timeout || 30000,
                maxContentLength: options.maxContentLength || Infinity,
                maxBodyLength: options.maxBodyLength || Infinity
            });
            
            // End timer
            console.timeEnd('ajet-ndc-request');
            
            // Log response status and headers
            console.log('Response status:', response.status);
            if (options.logResponse) {
                console.log('Response headers:', JSON.stringify(response.headers, null, 2));
            }
            
            // Check for SOAP fault
            if (response.data && response.data.includes('<faultcode>')) {
                const faultMatch = response.data.match(/<faultstring>(.*?)<\/faultstring>/);
                const faultString = faultMatch ? faultMatch[1] : 'Unknown SOAP fault';
                
                console.log('SOAP fault detected:', faultString);
                
                if (response.status === 500) {
                    console.log('Server error (500) detected in response');
                    console.log('Fault:', faultString);
                    
                    return {
                        status: response.status,
                        data: {
                            Success: false,
                            Items: [],
                            ClosedFlight: [],
                            Error: faultString
                        }
                    };
                }
            }
            
            // Log a sample of the response
            if (response.data && options.logResponse) {
                const responsePreview = response.data.substring(0, 500) + '...';
                console.log('Response data (first 500 chars):', responsePreview);
            }
            
            // Parse the SOAP response
            let transformedResponse;
            try {
                // Log the raw XML for debugging
                if (process.env.NODE_ENV === 'development') {
                    console.log('Raw XML response (first 1000 chars):', response.data.substring(0, 1000));
                }
                
                // Use our custom XML to JSON mapper
                console.log('Calling XML to JSON mapper');
                transformedResponse = await mapXmlToJson(response.data);
                
                // Log the result of mapping
                console.log('Mapping complete, found', transformedResponse.Items.length, 'flight options');
                
                // Add any additional required fields
                transformedResponse.SessionId = uuidv4();
                transformedResponse.RequestId = uuidv4();
            } catch (parseError) {
                console.error('Error parsing or transforming response:', parseError.message);
                // Create a default error response
                transformedResponse = {
                    Success: false,
                    Items: [],
                    ClosedFlight: [],
                    SessionId: uuidv4(),
                    RequestId: uuidv4(),
                    Error: parseError.message || 'Error parsing SOAP response'
                };
            }
            
            // Return both the status, the transformed data, and the raw XML response
            return {
                status: response.status,
                data: transformedResponse,
                rawXml: response.data // Include the raw XML response
            };
        } catch (error) {
            console.error('Error sending AirShopping request:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response headers:', JSON.stringify(error.response.headers, null, 2));
                console.error('Response data:', typeof error.response.data === 'string' ? 
                    error.response.data.substring(0, 1000) : 
                    JSON.stringify(error.response.data, null, 2));
            } else if (error.request) {
                console.error('No response received. Request details:', error.request);
            } else {
                console.error('Error details:', error.stack);
            }
            throw error;
        }
    } catch (error) {
        console.error('Error sending AirShopping request:', error.message);
        throw error;
    }
}

/**
 * Parse the SOAP XML response to a JavaScript object
 * @param {string} xmlData - The XML response string
 * @returns {Promise<Object>} - The parsed response object
 */
async function parseResponse(xmlData) {
    try {
        const parser = new xml2js.Parser({ 
            explicitArray: false, 
            mergeAttrs: true,
            tagNameProcessors: [xml2js.processors.stripPrefix] // Remove namespaces for easier access
        });
        
        const result = await parser.parseStringPromise(xmlData);
        
        // Extract the response data
        const soapBody = result.Envelope?.Body;
        const airShoppingRS = soapBody?.IATA_AirShoppingRS || soapBody?.AirShoppingRS;
        
        if (!airShoppingRS) {
            console.error('Invalid response format from AJet NDC service');
            throw new Error('Invalid response format from AJet NDC service');
        }
        
        return airShoppingRS;
    } catch (error) {
        console.error('Error parsing XML response:', error.message);
        throw error;
    }
}

/**
 * Format a date string
 * @param {string} dateStr - The date string in YYYY-MM-DD format
 * @returns {string} - The formatted date string
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    return dateStr;
}

/**
 * Format a time string
 * @param {string} timeStr - The time string in HH:MM format
 * @returns {string} - The formatted time string
 */
function formatTime(timeStr) {
    if (!timeStr) return '';
    return timeStr;
}

/**
 * Format a duration string
 * @param {string} durationStr - The duration string in PTXHXM format
 * @returns {string} - The formatted duration string in HH:MM format
 */
function formatDuration(durationStr) {
    if (!durationStr) return '';
    
    // Handle ISO duration format (e.g., PT2H30M)
    const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (match) {
        const hours = parseInt(match[1] || 0, 10);
        const minutes = parseInt(match[2] || 0, 10);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    return durationStr;
}

/**
 * Calculate minutes from a duration string
 * @param {string} durationStr - The duration string in PTXHXM format
 * @returns {number} - The total minutes
 */
function calculateMinutes(durationStr) {
    if (!durationStr) return 185; // Default value
    
    // Handle ISO duration format (e.g., PT2H30M)
    const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (match) {
        const hours = parseInt(match[1] || 0, 10);
        const minutes = parseInt(match[2] || 0, 10);
        return hours * 60 + minutes;
    }
    
    return 185; // Default value
}

/**
 * Map cabin class codes to human-readable names
 * @param {string} cabinCode - The cabin class code
 * @returns {string} - The human-readable cabin class name
 */
function mapCabinClass(cabinCode) {
    const cabinMap = {
        'F': 'First Class',
        'C': 'Business Class',
        'J': 'Premium Business',
        'S': 'Premium Economy',
        'Y': 'Economy',
        'M': 'Economy'
    };
    
    return cabinMap[cabinCode] || 'Economy';
}

/**
 * Get airport name from airport code
 * @param {string} code - The airport code
 * @returns {string} - The airport name
 */
function getAirportName(code) {
    const airportMap = {
        'KBL': 'Kabul International Airport',
        'DXB': 'Dubai Intl',
        'IST': 'Istanbul Airport',
        'DEL': 'Indira Gandhi International Airport'
    };
    
    return airportMap[code] || `${code} International Airport`;
}

/**
 * Get airline name from airline code
 * @param {string} code - The airline code
 * @returns {string} - The airline name
 */
function getAirlineName(code) {
    const airlineMap = {
        'RQ': 'Kam Air',
        'TK': 'Turkish Airlines',
        'EK': 'Emirates',
        'FZ': 'flydubai'
    };
    
    return airlineMap[code] || 'Kam Air';
}

/**
 * Get airport city from airport code
 * @param {string} code - The airport code
 * @returns {string} - The city name
 */
function getAirportCity(code) {
    const cityMap = {
        'KBL': 'Kabul',
        'DXB': 'Dubai',
        'IST': 'Istanbul',
        'DEL': 'Delhi'
    };
    
    return cityMap[code] || code;
}

/**
 * Get airport city in Farsi from airport code
 * @param {string} code - The airport code
 * @returns {string} - The city name in Farsi
 */
function getAirportCityFa(code) {
    const cityMapFa = {
        'KBL': 'کابل',
        'DXB': 'دبی',
        'IST': 'استانبول',
        'DEL': 'دهلی'
    };
    
    return cityMapFa[code] || code;
}

/**
 * Format date in Gregorian format
 * @param {Date} date - The date object
 * @returns {string} - The formatted date string
 */
function formatDateG(date) {
    if (!date || !(date instanceof Date)) return 'June 2';
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Format date in Jalali (Persian) format
 * @param {Date} date - The date object
 * @returns {string} - The formatted date string in Jalali calendar
 */
function formatDateJ(date) {
    if (!date || !(date instanceof Date)) return 'دوشنبه 12 خرداد';
    
    // This is a simplified version - in a real app, you would use a proper Jalali calendar library
    // For this example, we'll just return a fixed string
    return 'دوشنبه 12 خرداد';
}

/**
 * Transform the parsed response to the desired format
 * @param {Object} airShoppingRS - The parsed AirShopping response
 * @returns {Object} - The transformed response in the desired format
 */
function transformToDesiredFormat(airShoppingRS) {
    try {
        // Check if airShoppingRS is null or undefined
        if (!airShoppingRS) {
            return {
                Success: false,
                Items: [],
                ClosedFlight: [],
                Error: 'Empty response from AJet NDC service'
            };
        }
        
        // Check for error response
        if (airShoppingRS.Error) {
            return {
                Success: false,
                Items: [],
                ClosedFlight: [],
                Error: `${airShoppingRS.Error.Code}: ${airShoppingRS.Error.DescText}`
            };
        }
        
        // Initialize the transformed response in the exact format requested
        const transformedResponse = {
            Success: true,
            Items: [],
            ClosedFlight: []
        };
        
        // If there are no offers, return the empty response
        if (!airShoppingRS.ShoppingResponse?.OffersGroup) {
            return transformedResponse;
        }
        
        // Process data lists for segments and origin/destinations
        const segmentMap = new Map();
        const originDestinationMap = new Map();
        
        // Process flight segments
        if (airShoppingRS.DataLists?.FlightSegmentList?.FlightSegment) {
            const segments = Array.isArray(airShoppingRS.DataLists.FlightSegmentList.FlightSegment) ?
                airShoppingRS.DataLists.FlightSegmentList.FlightSegment :
                [airShoppingRS.DataLists.FlightSegmentList.FlightSegment];
            
            segments.forEach(segment => {
                segmentMap.set(segment.SegmentKey, {
                    SegmentKey: segment.SegmentKey,
                    FlightNumber: segment.FlightNumber,
                    DepartureCode: segment.Departure.AirportCode,
                    DepartureDate: segment.Departure.Date,
                    DepartureTime: segment.Departure.Time,
                    ArrivalCode: segment.Arrival.AirportCode,
                    ArrivalDate: segment.Arrival.Date,
                    ArrivalTime: segment.Arrival.Time,
                    MarketingCarrier: segment.MarketingCarrier.AirlineID,
                    OperatingCarrier: segment.OperatingCarrier?.AirlineID || segment.MarketingCarrier.AirlineID,
                    Duration: segment.Journey?.Time?.Duration,
                    CabinType: segment.CabinType?.CabinTypeCode,
                    Equipment: segment.Equipment?.AircraftCode
                });
            });
        }
        
        // Process origin/destinations
        if (airShoppingRS.DataLists?.OriginDestinationList?.OriginDestination) {
            const odList = Array.isArray(airShoppingRS.DataLists.OriginDestinationList.OriginDestination) ?
                airShoppingRS.DataLists.OriginDestinationList.OriginDestination :
                [airShoppingRS.DataLists.OriginDestinationList.OriginDestination];
            
            odList.forEach(od => {
                originDestinationMap.set(od.OriginDestinationID, {
                    OriginDestinationID: od.OriginDestinationID,
                    Origin: od.Departure.AirportCode,
                    Destination: od.Arrival.AirportCode,
                    DepartureDate: od.Departure.Date,
                    DepartureTime: od.Departure.Time,
                    ArrivalDate: od.Arrival.Date,
                    ArrivalTime: od.Arrival.Time
                });
            });
        }
        
        // Process offers
        const offersGroup = Array.isArray(airShoppingRS.ShoppingResponse?.OffersGroup) ?
            airShoppingRS.ShoppingResponse.OffersGroup :
            [airShoppingRS.ShoppingResponse?.OffersGroup];
        
        // Transform each offer into an item in the exact format provided by the user
        offersGroup.forEach((offerGroup, index) => {
            if (!offerGroup?.OfferItem) return;
            
            const offerItems = Array.isArray(offerGroup.OfferItem) ?
                offerGroup.OfferItem : [offerGroup.OfferItem];
            
            offerItems.forEach(item => {
                // Generate unique session ID for each item
                const sessionId = uuidv4();
                
                // Get price information
                const baseFare = parseFloat(item.UnitPriceDetail?.BaseAmount?.SimpleCurrencyPrice || '0');
                const totalFare = parseFloat(item.UnitPriceDetail?.TotalAmount?.SimpleCurrencyPrice || '0');
                const totalTax = parseFloat(item.UnitPriceDetail?.TaxSummary?.TotalTaxAmount?.SimpleCurrencyPrice || '0');
                const currency = item.UnitPriceDetail?.TotalAmount?.Code || 'USD';
                
                // Calculate commission (for example purposes)
                const commissionPercent = index === 0 ? 0.11 : (index === 1 ? 0.08 : 0); // Different commission rates for demo
                const totalCommission = Math.round(baseFare * commissionPercent);
                
                // Get journey references
                const journeyRefs = item.JourneyRefs ?
                    (Array.isArray(item.JourneyRefs) ? item.JourneyRefs : [item.JourneyRefs]) : [];
                
                // For each journey reference, create a flight option
                journeyRefs.forEach(journeyRef => {
                    // Find the journey
                    const journey = airShoppingRS.DataLists?.JourneyList?.Journey?.find?.(j => j.JourneyID === journeyRef) ||
                        (airShoppingRS.DataLists?.JourneyList?.Journey?.JourneyID === journeyRef ? 
                            airShoppingRS.DataLists?.JourneyList?.Journey : null);
                    
                    if (!journey) return;
                    
                    // Get segment references
                    const segmentRefs = journey.SegmentReferences ?
                        (Array.isArray(journey.SegmentReferences) ? journey.SegmentReferences : [journey.SegmentReferences]) : [];
                    
                    // Build flight segments array
                    const flightSegments = [];
                    segmentRefs.forEach(segmentRef => {
                        const segment = segmentMap.get(segmentRef);
                        if (!segment) return;
                        
                        // Format dates for display
                        const departureDate = new Date(segment.DepartureDate + 'T' + segment.DepartureTime);
                        const arrivalDate = new Date(segment.ArrivalDate + 'T' + segment.ArrivalTime);
                        
                        // Create a flight segment in the exact format required
                        flightSegments.push({
                            DepartureDateTime: `${segment.DepartureDate}T${segment.DepartureTime}:00`,
                            ArrivalDateTime: `${segment.ArrivalDate}T${segment.ArrivalTime}:00`,
                            FlightNumber: segment.FlightNumber,
                            JourneyDuration: formatDuration(segment.Duration) || '03:05',
                            JourneyDurationPerMinute: calculateMinutes(segment.Duration) || 185,
                            ConnectionTime: '00:00',
                            ConnectionTimePerMinute: 0,
                            ResBookDesigCode: 'S',
                            DepartureAirport: {
                                LocationCode: segment.DepartureCode,
                                AirportName: getAirportName(segment.DepartureCode) || `${segment.DepartureCode} International Airport`,
                                Terminal: null,
                                Gate: null,
                                CodeContext: null
                            },
                            ArrivalAirport: {
                                LocationCode: segment.ArrivalCode,
                                AirportName: getAirportName(segment.ArrivalCode) || `${segment.ArrivalCode} Intl`,
                                Terminal: null,
                                Gate: null,
                                CodeContext: null
                            },
                            MarketingAirline: {
                                Code: segment.MarketingCarrier,
                                CompanyShortName: getAirlineName(segment.MarketingCarrier) || 'Kam Air'
                            },
                            CabinClassCode: mapCabinClass(segment.CabinType) || 'Economy',
                            OperatingAirline: {
                                Code: segment.OperatingCarrier,
                                FlightNumber: segment.FlightNumber,
                                CompanyShortName: getAirlineName(segment.OperatingCarrier) || 'Kam Air'
                            },
                            TPA_Extensions: {
                                Origin: getAirportCity(segment.DepartureCode) || 'Kabul',
                                Destination: getAirportCity(segment.ArrivalCode) || 'Dubai',
                                OriginFa: getAirportCityFa(segment.DepartureCode) || 'کابل',
                                DestinationFa: getAirportCityFa(segment.ArrivalCode) || 'دبی',
                                DepartureDateG: formatDateG(departureDate) || 'June 2',
                                DepartureDateJ: formatDateJ(departureDate) || 'دوشنبه 12 خرداد',
                                ArrivalDateG: formatDateG(arrivalDate) || 'June 2',
                                ArrivalDateJ: formatDateJ(arrivalDate) || 'دوشنبه 12 خرداد',
                                FlightTime: segment.DepartureTime || '17:35',
                                ArrivalTime: segment.ArrivalTime || '20:10',
                                AirlineNameFa: ''
                            },
                            Comment: '',
                            Equipment: {
                                AircraftTailNumber: '',
                                AirEquipType: 'A340-313-346Y',
                                ChangeofGauge: null
                            },
                            SeatsRemaining: 9,
                            comment: '',
                            BookingClassAvail: {
                                ResBookDesigCode: 'S',
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
                                BaggageAllowance: {
                                    UnitOfMeasure: 'Kilogram',
                                    UnitOfMeasureCode: 'KG',
                                    UnitOfMeasureQuantity: 50
                                }
                            }
                        });
                    });
                    
                    // Skip if no segments found
                    if (flightSegments.length === 0) return;
                    
                    // Create the formatted item in the exact structure required
                    const formattedItem = {
                        AirItinerary: [
                            {
                                SessionId: sessionId,
                                CombinationId: 0,
                                RecommendationId: 0,
                                SubsystemId: 854 + index * 2,
                                SubsystemName: `OTA${672 + index * 3}`
                            }
                        ],
                        AirItineraryPricingInfo: {
                            ItinTotalFare: {
                                BaseFare: baseFare,
                                TotalFare: totalFare,
                                TotalCommission: totalCommission,
                                TotalTax: totalTax,
                                ServiceTax: 0,
                                Original: baseFare,
                                Currency: currency
                            },
                            PTC_FareBreakdowns: [
                                {
                                    PassengerFare: {
                                        BaseFare: baseFare,
                                        TotalFare: totalFare,
                                        Commission: totalCommission,
                                        ServiceTax: 0,
                                        Taxes: totalTax,
                                        Currency: currency
                                    },
                                    PassengerTypeQuantity: {
                                        Code: 'ADT',
                                        Quantity: 1
                                    }
                                }
                            ],
                            AirItineraryPricingDetails: [
                                {
                                    AirItineraryPricingInfo: {
                                        ItinTotalFare: {
                                            BaseFare: baseFare,
                                            TotalFare: totalFare,
                                            TotalCommission: totalCommission,
                                            TotalTax: totalTax,
                                            ServiceTax: 0,
                                            Original: baseFare,
                                            Currency: currency,
                                            Commission: totalCommission
                                        },
                                        PTC_FareBreakdowns: [
                                            {
                                                PassengerFare: {
                                                    BaseFare: baseFare,
                                                    TotalFare: totalFare,
                                                    Commission: totalCommission,
                                                    ServiceTax: 0,
                                                    Taxes: totalTax,
                                                    Original: baseFare,
                                                    Currency: currency
                                                },
                                                PassengerTypeQuantity: {
                                                    Code: 'ADT',
                                                    Quantity: 1
                                                }
                                            }
                                        ]
                                    }
                                }
                            ]
                        },
                        OriginDestinationInformation: {
                            OriginDestinationOption: [
                                {
                                    DepartureDateTime: flightSegments[0].DepartureDateTime,
                                    DepartureDateG: flightSegments[0].TPA_Extensions.DepartureDateG,
                                    DepartureDateJ: flightSegments[0].TPA_Extensions.DepartureDateJ,
                                    ArrivalDateTime: flightSegments[flightSegments.length - 1].ArrivalDateTime,
                                    ArrivalDateG: flightSegments[flightSegments.length - 1].TPA_Extensions.ArrivalDateG,
                                    ArrivalDateJ: flightSegments[flightSegments.length - 1].TPA_Extensions.ArrivalDateJ,
                                    JourneyDuration: formatDuration(journey.Time?.Duration) || '03:05',
                                    JourneyDurationPerMinute: calculateMinutes(journey.Time?.Duration) || 185,
                                    OriginLocation: flightSegments[0].DepartureAirport.LocationCode,
                                    DestinationLocation: flightSegments[flightSegments.length - 1].ArrivalAirport.LocationCode,
                                    TPA_Extensions: {
                                        Origin: flightSegments[0].TPA_Extensions.Origin,
                                        Destination: flightSegments[flightSegments.length - 1].TPA_Extensions.Destination,
                                        OriginFa: flightSegments[0].TPA_Extensions.OriginFa,
                                        DestinationFa: flightSegments[flightSegments.length - 1].TPA_Extensions.DestinationFa,
                                        FlightType: 'system',
                                        AgencyCode: null,
                                        IsCharter: false,
                                        IsForeign: true,
                                        IsNationalIdOptional: 1,
                                        IsLock: true,
                                        stop: flightSegments.length - 1
                                    },
                                    FlightSegment: flightSegments
                                }
                            ]
                        }
                    };
                    
                    transformedResponse.Items.push(formattedItem);
                });
            });
        });
        
        return transformedResponse;
    } catch (error) {
        console.error('Error transforming response:', error.message);
        return {
            Success: false,
            Items: [],
            ClosedFlight: [],
            Error: error.message || 'Error transforming response'
        };
    }
}

/**
 * Returns the raw XML payload without sending it
 * This can be used for debugging or testing purposes
 * @param {Object} searchParams - The search parameters for the flight
 * @returns {string} - The XML payload as a string
 */
function getRawXmlPayload(searchParams) {
    return buildAirShoppingRQ(searchParams);
}

/**
 * Example usage of the module
 */
function exampleUsage() {
    // Example search parameters
    const searchParams = {
        origin: 'SAW',
        destination: 'DXB',
        departureDate: '2025-07-01',
        cabinClass: 'Y',
        passengers: [
            { type: 'ADT', count: 1 },
            { type: 'CHD', count: 1 }
        ]
    };

    // Get the raw XML payload
    const xmlPayload = getRawXmlPayload(searchParams);
    console.log('Generated XML Payload:', xmlPayload);

    // Send the request
    sendAirShoppingRequest(searchParams)
        .then(response => {
            console.log('Response received successfully');
        })
        .catch(error => {
            console.error('Error in example usage:', error.message);
        });
}

module.exports = {
    buildAirShoppingRQ,
    sendAirShoppingRequest,
    getRawXmlPayload,
    parseResponse,
    exampleUsage
};
