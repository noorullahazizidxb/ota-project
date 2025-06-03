/* eslint-disable max-depth */
/* eslint-disable max-statements */

// const modules = require('../../utility/modules');
// const citynetTravelUtil = require('citynet-travel-util');
const uuid = require('../../utility/uuid');
const saveRedis = require('../../utility/saveRedis');
const axios = require('axios');
// const qs = require('qs');
// const token = require("./../token/Token");
let self = {
    index(req, res) {
        let request = req.body;
        // serviceInfo = req.body.WebserviceAuthentication.loginInfo;
        // token = await partoToken.getToken(serviceInfo);
        self.getRuleDataInput(request, (varRuleResponse) => {
            // console.log(varRuleResponse);
            if (varRuleResponse === -1 || typeof varRuleResponse === 'undefined') {
                res.json({
                    Success: false,
                    Items: ''
                });
            } else {
                res.json({
                    Success: true,
                    Items:varRuleResponse
                });
            }
        });
                    
    },
    async getRuleDataInput(request, callback) {
        let redisRow = await saveRedis.getDataAsync(request.AirItinerary);
        let subsystemSearchResponse = {};
        let searchRequest = {};
        if (redisRow === -1) {
            let row = await self.getFromDatabase(request.AirItinerary);
            if (row === -1) {
                callback(-1);
            } else {

                subsystemSearchResponse = JSON.parse(row.subsystemSearchResponse);
                searchRequest = JSON.parse(row.searchRequest);
            }
        } else {
            subsystemSearchResponse = JSON.parse(redisRow.subsystemSearchResponse);
            searchRequest = JSON.parse(redisRow.searchRequest);
        }
        let flights = subsystemSearchResponse;
        let SegmentOptions = [];
        for (let o = 0; o < flights.OriginDestinationOptions.length; o++) {
            for (let f = 0; f < flights.OriginDestinationOptions[o].FlightSegments.length; f++) {
                SegmentOptions.push({
                    SegmentOptionKey:flights.OriginDestinationOptions[o].FlightSegments[f].SegmentOptionKey
                });
            }
        }
        let inputPenalty = {
            Target: searchRequest.WebserviceAuthentication.loginInfo.Target,
            FareSourceCode:flights.AirItineraryPricingInfo.FareSourceCode,
            ConversationId:flights.ConversationId,
            SegmentOptions
        };
        //  let response = await axios.post(url + '/api/XmlConnect/FlightSearch', searchBody, { headers: { 
        //             'Content-Type': 'application/json', 
        //             'Authorization': 'Bearer ' + token
        //         } });
        // let output = {};
        let varRuleResponse = [];
        axios.post(searchRequest.WebserviceAuthentication.loginInfo.url + '/api/XmlConnect/FarePolicy', inputPenalty, { headers: { 
            'Content-Type': 'application/json', 
            'Authorization': 'Bearer ' + searchRequest.WebserviceAuthentication.loginInfo.token
        } }).then(function (response) {
            console.log(8786, JSON.stringify(response.data));
            console.log(9999999);
            
            let result = [];
            // console.log(3232, response.data && response.data.errorCode === '0' && response.data.data && response.data.data !== null);
            
            // console.log(response.data, 1, response.data.errorCode === '0', 2, response.data.data, response.data.data && response.data.data !== null);
            
            if (response.data && response.data.Success === 'true' && response.data.data && response.data.data.FareRules && response.data.data.FareRules.length > 0) {
                // varRuleResponse.push({
                //     Subtitle: "penalties",
                //     Text: response.data.data.penalties
                // });
                    
                for (let i = 0; i < flights.OriginDestinationOptions.length; i++) {
                    if (response.data.data.FareRules[i] && response.data.data.FareRules[i].RuleDetails) {
                        try {
                            for (let j = 0; j < response.data.data.FareRules[i].RuleDetails.length; j++) {
                                varRuleResponse.push({
                                    Subtitle: response.data.data.FareRules[i].RuleDetails[j].Category,
                                    Text: [response.data.data.FareRules[i].RuleDetails[j].Rules.replace(/<br\/>/g, ' ')]
                                });
                            }
                        } catch (error) {
                            console.log("🚀 ~ getRuleDataInput ~ error:", error);
                            
                            
                        }
                        result.push({ FareReference: '',
                            Airline: flights.OriginDestinationOptions[i].FlightSegments[0].OperatingAirline.Code,
                            MarketAirline: flights.OriginDestinationOptions[i].FlightSegments[0].MarketingAirlineCode,
                            DepartureLocationCode: flights.OriginDestinationOptions[i].FlightSegments[0].DepartureAirportLocationCode,
                            ArrivalLocationCode: flights.OriginDestinationOptions[i].FlightSegments[flights.OriginDestinationOptions[i].FlightSegments.length - 1].ArrivalAirportLocationCode,
                            DetailRules: varRuleResponse });
                    }
                    // for (let j = 0; j < flights[i].segments.length; j++) {
                    
                    // }
                }
                
                callback(result);
            } else {
                callback(-1);
            }
            // console.log(JSON.stringify(output));
        }).catch(function (e) {
            console.log(e);
                
            callback(-1);
            
        });
      
        
    }, 
    async getFromDatabase(AirItinerary) {
        let row = await module.db.query(`select subsystemSearchResponse,searchRequest from results where sessionId=? and combinationId=?`, [
            uuid.getBinaryUUID(AirItinerary.SessionId),
            AirItinerary.CombinationId
        ]);
        if (row.length > 0) {
            return row[0];
        } 

        return -1;
    }

};
module.exports = self;


// const citynetTravelUtil = require('citynet-travel-util');

// // let request = {};
// // let Success = false;
// let self = {
//     async index(req, res) {
//         let request = req.body;
//         // serviceInfo = req.body.WebserviceAuthentication.loginInfo;
//         // token = await partoToken.getToken(serviceInfo);
//         let varRuleResponse = await self.getRuleDataInput(request);
//         if (varRuleResponse === -1) {
//             res.json({
//                 Success: false,
//                 Items: ''
//             });
//         } else {
//             res.json({
//                 Success: true,
//                 Items:varRuleResponse
//             });
//         }            
//     },
//     async getRuleDataInput(request) {
//         let redisRow = await saveRedis.getDataAsync(request.AirItinerary);
//         if (redisRow === -1) {
//             let result = [];
//             let row = [];
//             try {
//                 row = await modules.db.query(`call prcFindRules(?, ?);`, [
//                     request.AirItinerary.SessionId,
//                     request.AirItinerary.CombinationId
//                 ]);
//                 if (row[0].length > 0) {
//                     row[0][0].data = JSON.parse(row[0][0].data);
//                     result = await citynetTravelUtil.getFlightRules(row[0], request.PassengerType);

//                     return result;
//                 } 
                
//                 return -1;
//             } catch (e) {
//                 console.log(e);
            
//                 return -1;
//             }
//         }
//         let flights = JSON.parse(redisRow.subsystemSearchResponse);
//         let ruleData = null;
//         if (flights.CRCNRules !== null) {
//             ruleData = flights.CRCNRules.split('/');
//         }
//         let  dataType = [
//             { origin:flights.from,
//                 class:flights.type_flight,
//                 destination:flights.to,
//                 iata:flights.rightIata,
//                 data:ruleData }
//         ];
//         let result =  self.getFlightRules(dataType);
        
//         return result;
//     },
//     
// };
// module.exports = self;