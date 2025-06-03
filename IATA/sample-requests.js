/**
 * Sample Request and Response Payloads for AJet NDC Integration
 * 
 * This file contains example request and response payloads for the AJet NDC API integration.
 * These samples can be used for testing and documentation purposes.
 */

/**
 * Sample Search Request Payload
 * 
 * This is an example of the request body that should be sent to the search endpoint.
 * 
 * @example
 * POST /api/v1/search
 * Headers: { "Content-Type": "application/json" }
 * Body: { ...sampleSearchRequest }
 */
const sampleSearchRequest = {
    // Required parameters
    origin: 'SAW',  // Departure airport IATA code
    destination: 'ESB',  // Arrival airport IATA code
    departureDate: '2025-07-15',  // Format: YYYY-MM-DD
    
    // Optional parameters with defaults
    cabinClass: 'Y',  // Y=Economy, C=Business, F=First
    
    // Passengers configuration (defaults to 1 adult if not specified)
    passengers: [
        { type: 'ADT', count: 1 },  // Adult
        { type: 'CHD', count: 1 },  // Child
        { type: 'INF', count: 0 }   // Infant
    ],
    
    // Additional search options
    directOnly: false,  // Set to true for direct flights only
    maxStops: 1,       // Maximum number of stops (0 for direct only)
    
    // Currency and language preferences
    currency: 'USD',   // Default: USD
    language: 'EN',    // Default: EN
    
    // Metadata (optional)
    metadata: {
        client: 'web',  // web, mobile, api, etc.
        sessionId: 'session_123456',
        requestId: 'req_' + Date.now()
    }
};

/**
 * Sample Search Response Payload
 * 
 * This is an example of the response that will be returned from the search endpoint.
 */
const sampleSearchResponse = {
    success: true,
    data: {
        // List of available flight offers
        offers: [
            {
                offerId: 'OFFER123',
                owner: 'AJ',
                offerItems: [
                    {
                        offerItemId: 'ITEM001',
                        price: 199.99,
                        currency: 'USD',
                        passengerRefs: ['PAX1'],
                        journeyRefs: ['JNY1']
                    }
                ]
            }
        ],
        
        // List of origin-destination pairs
        originDestinationList: [
            {
                id: 'OD1',
                origin: 'SAW',
                destination: 'ESB',
                departureTime: '2025-07-15T08:00:00',
                arrivalTime: '2025-07-15T09:30:00',
                duration: 'PT1H30M'  // ISO 8601 duration format
            }
        ],
        
        // List of flight segments
        flightSegmentList: [
            {
                id: 'SEG1',
                flightNumber: 'AJ123',
                departure: 'SAW',
                arrival: 'ESB',
                departureTime: '2025-07-15T08:00:00',
                arrivalTime: '2025-07-15T09:30:00',
                airline: 'AJ',
                operatingAirline: 'AJ',
                equipment: '738',  // Aircraft code
                cabinClass: 'Y',
                bookingClass: 'M',
                fareBasis: 'ME3LOT',
                duration: 'PT1H30M',
                distance: 350,  // in km
                stops: 0,
                baggageAllowance: {
                    quantity: 1,
                    weight: 20,  // kg
                    unit: 'kg'
                },
                fareRules: [
                    {
                        code: 'CHGS',
                        description: 'CHANGES PERMITTED FOR FEE',
                        type: 'BEFORE_DEPARTURE'
                    },
                    {
                        code: 'RFND',
                        description: 'TICKET IS NON-REFUNDABLE',
                        type: 'BEFORE_DEPARTURE'
                    }
                ]
            }
        ],
        
        // Pricing information
        priceList: [
            {
                id: 'PRICE1',
                totalAmount: 199.99,
                baseFare: 150.00,
                taxes: [
                    {
                        code: 'YQ',
                        amount: 30.00,
                        description: 'Fuel Surcharge'
                    },
                    {
                        code: 'YR',
                        amount: 19.99,
                        description: 'Airport Tax'
                    }
                ],
                currency: 'USD',
                passengerFares: [
                    {
                        passengerType: 'ADT',
                        quantity: 1,
                        baseFare: 150.00,
                        taxes: 49.99,
                        totalAmount: 199.99
                    }
                ]
            }
        ]
    },
    
    // Metadata about the response
    metadata: {
        timestamp: '2025-06-02T13:55:25+04:30',
        transactionId: 'TXN1234567890',
        responseId: 'RES9876543210',
        currency: 'USD',
        language: 'EN',
        cache: {
            cached: false,
            ttl: 3600
        }
    },
    
    // Pagination information (if applicable)
    pagination: {
        totalResults: 1,
        currentPage: 1,
        pageSize: 10,
        totalPages: 1
    }
};

/**
 * Sample Error Response
 * 
 * This is an example of an error response that might be returned.
 */
const sampleErrorResponse = {
    success: false,
    error: {
        code: 'INVALID_REQUEST',
        message: 'Invalid request parameters',
        details: [
            {
                field: 'departureDate',
                message: 'must be a future date'
            },
            {
                field: 'origin',
                message: 'must be a valid IATA airport code'
            }
        ]
    },
    metadata: {
        timestamp: '2025-06-02T13:55:25+04:30',
        requestId: 'req_1234567890',
        traceId: 'trace_9876543210'
    }
};

module.exports = {
    sampleSearchRequest,
    sampleSearchResponse,
    sampleErrorResponse
};
