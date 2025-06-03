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
            console.log('error:', e);
                        
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
        console.log(result);
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
        console.log(33, JSON.stringify(response.data));
        
        if (response.data && response.data.Success === 'true' && response.data.ConversationId && response.data.ConversationId !== "" &&  response.data.data && response.data.data.PricedItineraries && response.data.data.PricedItineraries.length > 0) {
            for (let i = 0; i < response.data.data.PricedItineraries.length; i++) {
                response.data.data.PricedItineraries[i].ConversationId = response.data.ConversationId;
            }
            responseOutput = response.data.data.PricedItineraries;
        }
        
    } catch (error) {
        console.log("🚀 ~ search ~ error:", error);
        
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
    console.log('Received request to search controller');
    console.time('search-ndc');
    
    try {
        const {
            origin,
            destination,
            departureDate,
            cabinClass = 'Y',
            passengers = [{ type: 'ADT', count: 1 }],
            currency = 'USD',
            language = 'EN'
        } = req.body;

        // Validate required parameters
        if (!origin || !destination || !departureDate) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: origin, destination, departureDate'
            });
        }

        // doAirShop module is already imported at the top of the file
        
        // Prepare search parameters for the AirShopping request
        let searchParams;
        
        try {
            console.log('Building SOAP request with parameters:', {
                origin,
                destination,
                departureDate,
                cabinClass: cabinClass || 'Y',
                passengerCount: (passengers || [{ type: 'ADT', count: 1 }]).length
            });
            
            // getRawXmlPayload is already imported at the top of the file
            
            searchParams = {
                origin: origin,
                destination: destination,
                departureDate: departureDate,
                cabinClass: cabinClass || 'Y',
                adults: passengers?.filter(p => p.type === 'ADT')?.length || 1,
                children: passengers?.filter(p => p.type === 'CHD')?.length || 0,
                infants: passengers?.filter(p => p.type === 'INF')?.length || 0,
                currency: currency || 'USD',
                language: language || 'EN'
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

        console.log('Sending request to AJet NDC service');
        
        // Add a timeout to the entire operation
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, 120000); // 2 minutes timeout for the entire operation
        
        // Make the request to AJet NDC service using our fixed doAirShop module
        let response;
        try {
            console.time('ndc-request');
            
            // Get the raw XML request for logging and response
            const rawXmlRequest = await getRawXmlPayload(searchParams);
            console.log('Raw XML Request:', rawXmlRequest);
            
            // If the format=xml query parameter is provided, return the raw XML request
            if (req.query.format === 'xml') {
                clearTimeout(timeout);
                return res.status(200).type('application/xml').send(rawXmlRequest);
            }
            
            // Use the sendAirShoppingRequest function from doAirShop.js
            response = await sendAirShoppingRequest(searchParams, {
                timeout: 60000, // 60 seconds timeout
                logRequest: true, // Log the request for debugging
                logResponse: true, // Log the response for debugging
                maxContentLength: 50 * 1024 * 1024, // 50MB
                maxBodyLength: 50 * 1024 * 1024 // 50MB
            });
            
            console.timeEnd('ndc-request');
            console.log('Response status:', response.status);
            
            // The response is already in the desired format
            // No need to parse XML or transform the data
            if (response.data) {
                console.log('Response contains data with', 
                    response.data.Items?.length || 0, 'flight options');
            }
            
        } catch (error) {
            console.error('Error making request to AJet NDC service:', error.message);
            
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error('Response status:', error.response.status);
                console.error('Response headers:', error.response.headers);
                console.error('Response data:', error.response.data);
            } else if (error.request) {
                // The request was made but no response was received
                console.error('No response received. Request details:', {
                    url: process.env.AJET_NDC_ENDPOINT || 'https://tkj-stage.crane.aero/cranendc/v20.1/CraneNDCService',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/xml;charset=UTF-8',
                        'SOAPAction': 'cranendc/doAirShop',
                        'username': process.env.AJET_NDC_USER_ID || 'NEWLINKTRAVEL',
                        'password': '******' // Masked for security
                    },
                    searchParams: searchParams,
                    timeout: error.config?.timeout,
                    proxy: error.config?.proxy
                });
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error('Request setup error:', error.message);
            }
            
            console.timeEnd('search-ndc');
            return res.status(504).json({
                success: false,
                error: 'Gateway timeout',
                message: 'The request to the airline service timed out',
                details: error.message
            });
        }

        console.log('Processing AJet NDC response');
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
        console.log(`Found ${response.data.Items?.length || 0} flight options`);
        
        // Log the full response in development for debugging
        if (process.env.NODE_ENV === 'development') {
            console.log('Response sample:', JSON.stringify(response.data).substring(0, 2000) + '...');
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
        console.log('Response data structure:', 
            Object.keys(response.data).length > 0 ? 
            Object.keys(response.data) : 'Empty response');
            
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
