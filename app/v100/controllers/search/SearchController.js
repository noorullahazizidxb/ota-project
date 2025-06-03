/* eslint-disable camelcase */
/* eslint-disable no-loop-func */
/* eslint-disable max-depth */
/* eslint-disable max-statements */
/* eslint-disable no-await-in-loop */

const axios = require('axios');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
// Import helper functions from local modules
const cacheAirport = require('../../utility/airportListRedisCache');

// Import the doAirShop module for SOAP requests with correct path
const { sendAirShoppingRequest, getRawXmlPayload } = require('../../../../IATA/doAirShop');

function getResults(input, callback) {
    
    let output = {};

    axios.post(input.url + '/json/precisePricing_V6', input.priceInput).then(function (response) {
        // console.log(9999, JSON.stringify(response.data));
                
        if (response.data && response.data.errorCode === '0' && response.data.data && response.data.data !== null) {
            output = {
                Success: true,
                request: input,
                error: null,
                data: response.data
            };
        }
                 //console.log(JSON.stringify(output));
        callback(null, output);
    }).catch(function (e) {
        try {
            // Error occurred during processing
                        
        } catch (error) {
            console.error('Error in search controller:', error);
            return res.status(500).json({
                Success: false,
                Message: 'Internal server error during search',
                Error: error.message
            });
        } finally {
            console.timeEnd('search');
        }
    });
    
}

function bulkInsert(finalResults, sessionId, prmExchanged, prmRequest) {
    let redisArray = [];

    finalResults.forEach((item, i) => {
        redisArray.push({
            sessionId: sessionId.uuid,
            combinationId: i,
            searchRequest: JSON.stringify(prmRequest),
            subsystemSearchResponse: JSON.stringify(item),
            searchResponse: JSON.stringify(prmExchanged[i]),
            subsystemId: prmRequest.WebserviceAuthentication.subsystemId
        });
    });
    
    async.map(redisArray, saveRedis.store, (result) => {
        // Result from bulk insert
    });
   
}

// getSearchesInputs is already imported at the top of the file

async function isInternationalSearch(request) {
    ////////////////////// حذف پرواز های داخلی  ////////
    for (let i = 0; i < request.OriginDestinationInformations.length; i++) {
        let origin = await cacheAirport.cacheSynchronize(request.OriginDestinationInformations[i].OriginLocation.LocationCode);
        let destination = await cacheAirport.cacheSynchronize(request.OriginDestinationInformations[i].DestinationLocation.LocationCode);
        if (origin.countryCode === 'IR' && destination.countryCode === 'IR') {
            return false;
        }
      
    }

    return true;
}
async function search(searchBody, url, token) {
    let responseOutput = [];
    
    try {
        let response = await axios.post(url + '/api/XmlConnect/FlightSearch', searchBody, { headers: { 
            'Content-Type': 'application/json', 
            'Authorization': 'Bearer ' + token
        } });
        // Response data received
        
        if (response.data && response.data.Success === 'true' && response.data.ConversationId && response.data.ConversationId !== "" &&  response.data.data && response.data.data.PricedItineraries && response.data.data.PricedItineraries.length > 0) {
            for (let i = 0; i < response.data.data.PricedItineraries.length; i++) {
                response.data.data.PricedItineraries[i].ConversationId = response.data.ConversationId;
            }
            responseOutput = response.data.data.PricedItineraries;
        }
        
    } catch (error) {
        // Search error occurred
        
    }

    return responseOutput;

}


function getLastResult(result) {
    // console.log(JSON.stringify(result));
    
    let output = [];
    let flightsData = [];
    for (let f = 0; f < result.length; f++) {
        const baggages1 = result[f].solution.baggages["1"].baggage.split(",");
        for (let i = 0; i < result[f].flights.length; i++) {
            let segments = [];
            for (let j = 0; j < result[f].flights[i].segmentIds.length; j++) {
                let segFilter = result[f].segments.filter((segment) => segment.segmentId === result[f].flights[i].segmentIds[j]);
                 
                segments.push(segFilter[0]);
            
            }
            result[f].flights[i].segments = segments;
            flightsData.push(result[f].flights[i]);
        }
        let flights = [];
        let flightFilter = flightsData.filter((flightData) => flightData.flightId === result[f].solution.journeys.journey_0[0]);
        for (let h = 0; h < flightFilter[0].segments.length; h++) {
            flightFilter[0].segments[h].baggage = baggages1[h];
        }
        flights.push(flightFilter[0]);
        if (result[f].solution.journeys.journey_1 && Array.isArray(result[f].solution.journeys.journey_1) && result[f].solution.journeys.journey_1.length > 0) {
            let flightFilter1 = flightsData.filter((flightData) => flightData.flightId === result[f].solution.journeys.journey_1[0]);
            const baggages2 = result[f].solution.baggages["2"].baggage.split(",");
            for (let h = 0; h < flightFilter1[0].segments.length; h++) {
                flightFilter1[0].segments[h].baggage = baggages2[h];
            }
            flights.push(flightFilter1[0]);
        }
        result[f].solution.flights = flights;
        output.push(result[f].solution);
    }
    
    return output;
}

/**
 * Search controller endpoint
 * Handles flight search requests to AJet NDC service
 */
async function index(req, res) {
    // Request received by search controller
    console.time('search-ndc');
    
    try {
        // Parse new payload structure
        const {
            Lang,
            TravelPreference,
            TravelerInfoSummary,
            OriginDestinationInformations
        } = req.body;

        // Validate required fields in new payload with more detailed validation
        if (!Lang) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: Lang'
            });
        }
        
        if (!TravelPreference) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: TravelPreference'
            });
        }
        
        if (!TravelerInfoSummary) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: TravelerInfoSummary'
            });
        }
        
        // Check AirTravelerAvail structure
        if (!TravelerInfoSummary.AirTravelerAvail) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: TravelerInfoSummary.AirTravelerAvail'
            });
        }
        
        // Check PassengerTypeQuantity array
        if (!TravelerInfoSummary.AirTravelerAvail.PassengerTypeQuantity || 
            !Array.isArray(TravelerInfoSummary.AirTravelerAvail.PassengerTypeQuantity) || 
            TravelerInfoSummary.AirTravelerAvail.PassengerTypeQuantity.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: TravelerInfoSummary.AirTravelerAvail.PassengerTypeQuantity must be a non-empty array'
            });
        }
        
        if (!OriginDestinationInformations || !Array.isArray(OriginDestinationInformations) || OriginDestinationInformations.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: OriginDestinationInformations'
            });
        }
        
        // Extract first segment and validate required fields
        const segment = OriginDestinationInformations[0];
        if (!segment.OriginLocation || !segment.OriginLocation.LocationCode) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: Origin location code'
            });
        }
        
        if (!segment.DestinationLocation || !segment.DestinationLocation.LocationCode) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: Destination location code'
            });
        }
        
        if (!segment.DepartureDateTime) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: Departure date time'
            });
        }

        // Extract passenger counts - no default values
        let adultCount = 0, childCount = 0, infantCount = 0;
        const passengerTypes = TravelerInfoSummary.AirTravelerAvail.PassengerTypeQuantity;
        
        // Extract passenger counts from the passenger types
        passengerTypes.forEach(pt => {
            // Skip invalid entries
            if (!pt.Code || pt.Quantity === undefined) {
                return;
            }
            
            // Convert quantity to number if it's a string
            const quantity = parseInt(pt.Quantity, 10);
            
            // Assign to the appropriate counter
            if (pt.Code === 'ADT') adultCount = quantity;
            else if (pt.Code === 'CHD') childCount = quantity;
            else if (pt.Code === 'INF') infantCount = quantity;
            // Handle SH as adult (custom code for adult/standard human)
            else if (pt.Code === 'SH' && quantity > 0) {
                adultCount = quantity;
            }
        });
        
        // Check if any passenger type has a quantity > 0
        const hasPassengers = passengerTypes.some(pt => parseInt(pt.Quantity, 10) > 0);
        
        // Validate at least one passenger is specified
        if (!hasPassengers) {
            return res.status(400).json({
                success: false,
                error: 'At least one passenger must be specified'
            });
        }
        
 

        // Extract location and date information
        const origin = segment.OriginLocation.LocationCode;
        const destination = segment.DestinationLocation.LocationCode;
        const departureDate = segment.DepartureDateTime;
        // If needed: const arrivalDate = segment.ArrivalDateTime;
        const cabinClass = TravelPreference.CabinPref?.Cabin;

        // Build searchParams for downstream usage
        try {
            // Log only the parameter values, not searchParams itself
            
            const searchParams = {
                origin,
                destination,
                departureDate,
                cabinClass,
                adults: adultCount,
                children: childCount,
                infants: infantCount,
                language: Lang,
                travelPreference: TravelPreference,
                travelerInfoSummary: TravelerInfoSummary,
                originDestinationInformations: OriginDestinationInformations
            };
        } catch (error) {
            console.error('Error preparing search parameters:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to prepare search parameters',
                message: error.message,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }

        // Prepare search parameters for the AirShopping request
        let searchParams;
        
        try {
            // Validate required parameters
            if (!cabinClass) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required parameter: CabinPref.Cabin'
                });
            }
            
            searchParams = {
                origin: origin,
                destination: destination,
                departureDate: departureDate,
                cabinClass: cabinClass,
                // Include original passenger types from the payload
                passengerTypes: TravelerInfoSummary.AirTravelerAvail.PassengerTypeQuantity,
                // Keep these for backward compatibility
                adults: adultCount,
                children: childCount,
                infants: infantCount,
                language: Lang
            };
        } catch (error) {
            console.error('Error preparing search parameters:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to prepare search parameters',
                message: error.message,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }

        // Sending request to AJet NDC service
        
        // Add a timeout to the entire operation
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, 120000); // 2 minutes timeout for the entire operation
        
        // Make the request to AJet NDC service using our fixed doAirShop module
        let response;
        try {
            // Get the raw XML request for the payload
            const rawXmlRequest = await getRawXmlPayload(searchParams);
            
            // If format=xml is specified, return the raw XML request
            if (req.query.format === 'xml') {
                clearTimeout(timeout);
                return res.status(200).type('application/xml').send(rawXmlRequest);
            }
            
            // Use the sendAirShoppingRequest function from doAirShop.js
            response = await sendAirShoppingRequest(searchParams, {
                timeout: 60000, // 60 seconds timeout
                maxContentLength: 50 * 1024 * 1024, // 50MB
                maxBodyLength: 50 * 1024 * 1024 // 50MB
            });
            
            // Process the response data
            if (response.data) {
                // If format=xml query parameter is provided, return the raw XML response
                if (req.query.format === 'xml') {
                    if (typeof response.data === 'string' && response.data.includes('<?xml')) {
                        return res.status(200).type('application/xml').send(response.data);
                    }
                    if (response.originalData && typeof response.originalData === 'string') {
                        return res.status(200).type('application/xml').send(response.originalData);
                    }
                }
                
                // Convert XML to JSON if needed
                let jsonData = response.data;
                
                // If the response is XML, convert it to JSON
                if (typeof response.data === 'string' && response.data.includes('<?xml')) {
                    try {
                        // Use the mapXmlToJson function to convert XML to JSON
                        jsonData = await mapXmlToJson(response.data);
                    } catch (error) {
                        // Return a structured error response
                        return res.status(500).json({
                            success: false,
                            error: 'Failed to convert XML response to JSON',
                            message: error.message
                        });
                    }
                }
                
                // Return the JSON response
                return res.status(200).json({
                    success: true,
                    data: jsonData
                });
            }
            
        } catch (error) {
            // Clear the timeout to prevent memory leaks
            clearTimeout(timeout);
            
            // Handle different types of errors
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
            } else if (error.request) {
                // The request was made but no response was received
                // Log request details for troubleshooting
            } else {
                // Something happened in setting up the request that triggered an Error
            }
            
            console.timeEnd('search-ndc');
            return res.status(504).json({
                success: false,
                error: 'Gateway timeout',
                message: 'The request to the airline service timed out',
                details: error.message
            });
        }

        // Processing AJet NDC response
        console.timeEnd('search-ndc');
        
        // The response is already transformed by doAirShop.js
        if (!response.data) {
            console.error('Invalid response format from AJet NDC service');
            throw new Error('Invalid response format from AJet NDC service');
        }
        
        // Check for error response
        if (!response.data.Success) {
            console.error('Error from AJet NDC service:', response.data.Error);
            return res.status(400).json({
                success: false,
                error: 'NDC_SERVICE_ERROR',
                message: response.data.Error,
                details: response.data
            });
        }
        
        // Log the number of flight options found
        // Flight options found
        
        // Log the full response in development for debugging
        if (process.env.NODE_ENV === 'development') {
            // Response sample received
        }
        
        // Format the response according to our API standards
        const formattedResponse = {
            success: true,
            data: response.data, // This contains the transformed data in the exact format requested
            metadata: {
                timestamp: new Date().toISOString(),
                // Note: SessionId and RequestId might not be available in the new format
                ...(response.data.SessionId && { sessionId: response.data.SessionId }),
                ...(response.data.RequestId && { requestId: response.data.RequestId })
            }
        };
        
        // Log the structure of the response data
        // Response data structure processed
            
        // Send the formatted response
        return res.json(formattedResponse);
        
    } catch (error) {
        console.error('Error in search controller:', error);
        console.timeEnd('search-ndc');
        
        let statusCode = 500;
        let errorMessage = 'Failed to process search request';
        let errorDetails = error.message;
        
        // Handle specific error types
        if (error.code === 'ETIMEDOUT') {
            statusCode = 504; // Gateway Timeout
            errorMessage = 'Request to AJet NDC service timed out';
        } else if (error.code === 'ENOTFOUND') {
            statusCode = 502; // Bad Gateway
            errorMessage = 'Could not connect to AJet NDC service';
        } else if (error.code === 'ECONNREFUSED') {
            statusCode = 503; // Service Unavailable
            errorMessage = 'AJet NDC service is currently unavailable';
        } else if (error.response) {
            // Handle HTTP errors from the SOAP service
            statusCode = error.response.status || 502;
            errorMessage = `AJet NDC service returned an error (${statusCode})`;
            
            try {
                // Try to extract error details from SOAP fault
                if (error.response.data) {
                    const faultMatch = error.response.data.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/i);
                    if (faultMatch && faultMatch[1]) {
                        errorDetails = faultMatch[1].trim();
                    } else {
                        errorDetails = error.response.data.substring(0, 1000);
                    }
                }
            } catch (e) {
                console.error('Error parsing error response:', e);
            }
        }
        
        // Log detailed error in development
        if (process.env.NODE_ENV === 'development') {
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack,
                response: error.response?.data ? 'Response data available' : 'No response data'
            });
        }
        
        return res.status(statusCode).json({
            success: false,
            error: errorMessage,
            details: errorDetails,
            // Include response data if available
            ...(error.response?.data && { data: error.response.data }),
            ...(process.env.NODE_ENV === 'development' && { 
                stack: error.stack,
                originalError: error.message
            })
        });
    }
}

module.exports = { index };
