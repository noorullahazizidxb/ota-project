/* eslint-disable require-unicode-regexp */
const modules = require('../../utility/modules');
// const citynetTravelUtil = require('citynet-travel-util');
const uuid = require('../../utility/uuid');
const saveRedis = require('../../utility/saveRedis');

let self = {
    async index(req, res) {
        let request = req.body;
        let varRow = await self.getBaggageData(request.AirItinerary);

        // console.log(varRow);
        if (varRow.length > 0) {
            res.json({
                Success: true,
                Items: self.getFlightBaggage(varRow[0].flights, varRow[0].subsystemSearchResponse, request.PassengerType)
            });
        } else {
            res.json({
                Success: true,
                Items: []
            });
        }
        // request = req.body;
        // let varRow = await self.getBaggageData(request.AirItinerary.SessionId, request.AirItinerary.CombinationId);

        // // console.log(varRow);
        // if (varRow.length > 0) {
        //     res.json({
        //         Success: true,
        //         Items: citynetTravelUtil.getFlightBaggage(JSON.parse(varRow[0].flights), request.PassengerType)
        //     });
        // } else {
        //     res.json({
        //         Success: true,
        //         Items: []
        //     });
        // }

        // serviceInfo = req.body.WebserviceAuthentication.loginInfo;

    },
    async getBaggageData(AirItinerary) {
        let redisRow = await saveRedis.getDataAsync(AirItinerary);
        if (redisRow === -1) {
            let varRow = [];
            try {
                varRow = await modules.db.query(`SELECT searchResponse->>"$.OriginDestinationInformation.OriginDestinationOption" AS flights, subsystemSearchResponse FROM results where sessionId = ? and combinationId = ?`, [
                    uuid.getBinaryUUID(AirItinerary.SessionId),
                    AirItinerary.CombinationId
                ]);
                varRow[0].flights = JSON.parse(varRow[0].flights);
            } catch (e) {
                console.log(e);

                return [];
            }

            return varRow;
        }

        return [
            {
                flights: JSON.parse(redisRow.searchResponse).OriginDestinationInformation.OriginDestinationOption,
                subsystemSearchResponse : JSON.parse(redisRow.subsystemSearchResponse)
            }
        ];
    },
    getFlightBaggage(flights, subsystemSearchResponse, passengerType) {
        // console.log(passengerType);
        let result = [];
        for (let i = 0; i < flights.length; i++) {
            for (let j = 0; j < flights[i].FlightSegment.length; j++) {

                result.push({
                    BaggageAllowance: self.getBaggage(passengerType, subsystemSearchResponse.flights[i]),
                    FlightNumber: flights[i].FlightSegment[j].FlightNumber,
                    Origin: flights[i].FlightSegment[j].TPA_Extensions.Origin,
                    Destination: flights[i].FlightSegment[j].TPA_Extensions.Destination,
                    DepartureAirport: flights[i].FlightSegment[j].DepartureAirport,
                    ArrivalAirport: flights[i].FlightSegment[j].ArrivalAirport,
                    OperatingAirline: flights[i].FlightSegment[j].OperatingAirline
                });
            }
        }

        return result;
    },
    getBaggage(/*isForeign, */passengerType/*, CabinClassCode*/, element) {
        let BaggageAllowance = {
            UnitOfMeasure: "Kilogram",
            UnitOfMeasureCode: "KG",
            UnitOfMeasureQuantity: null
        };
        // const baggageRegex = ;
        const match = element.segments[0].baggage.match(/(\d+PC)(\d+KG)/);
        if (match) {
            BaggageAllowance = {
                UnitOfMeasure: "pieces",
                UnitOfMeasureCode: "PC",
                UnitOfMeasureQuantity: match[1].match(/\d+/)[0]
            };
        } else {
            const match1 =  element.segments[0].baggage.match(/(\d+PC)/);
            if (match1) {
                BaggageAllowance = {
                    UnitOfMeasure: "pieces",
                    UnitOfMeasureCode: "PC",
                    UnitOfMeasureQuantity: match1[0].match(/\d+/)[0]
                };
            } else {
                const match2 =  element.segments[0].baggage.match(/(\d+KG)/);
                if (match2) {
                    BaggageAllowance = {
                        UnitOfMeasure: "Kilogram",
                        UnitOfMeasureCode: "KG",
                        UnitOfMeasureQuantity: match2[0].match(/\d+/)[0]
                    };
                }
            }
        }
        // console.log(Baggage);
        
        if (passengerType === 'INF') {
            return {
                UnitOfMeasure: "Kilogram",
                UnitOfMeasureCode: "KG",
                UnitOfMeasureQuantity: null
            };
        } 
        
        return BaggageAllowance;
        

    }

};
module.exports = self;