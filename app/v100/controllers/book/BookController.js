/* eslint-disable complexity */
/* eslint-disable require-unicode-regexp */
/* eslint-disable camelcase */
/* eslint-disable require-atomic-updates */
/* eslint-disable max-depth */
/* eslint-disable max-statements */
const modules = require('../../utility/modules');
const uuid = require('../../utility/uuid');
const axios = require('axios');
const qs = require('qs');
const ota = require('./Ota2017b');
// const lodash = require('lodash');
const currency = require('../../utility/currencyExchange');
// const getCurrency = require("../../utility/getCurrency");

// const rabbitmqClient = require('../../amqp/client/rabbitmqClientSimple');
// let request = {};
const saveRedis = require('../../utility/saveRedis');
const gensecClient = require('../../../../grpcClients/gensecGrpcClient');
// const token = require("./../token/Token");

let self = {
    async checkData(request) {
        let rows = await modules.db.query(`SELECT sessionId FROM results
        WHERE sessionId = ? AND combinationId = ? `, [
            uuid.getBinaryUUID(request.AirItinerary.SessionId),
            request.AirItinerary.CombinationId
        ]);
        if (rows.length > 0) {
            return true;
        }
        let redisRow = await saveRedis.getDataAsync(request.AirItinerary);
        //console.log(JSON.stringify(redisRow));
        if (redisRow === -1) {
            return false;
        }
        await modules.db.query(`insert into results (id, sessionId, combinationId, searchRequest, subsystemSearchResponse,searchResponse) VALUES( ?, ?, ?, ?, ?, ?)`, [
            uuid.createUUID().buffer,
            uuid.getBinaryUUID(redisRow.sessionId),
            parseInt(redisRow.combinationId, 10),
            redisRow.searchRequest,
            redisRow.subsystemSearchResponse,
            redisRow.searchResponse
        ]);

        return true;

    },
    async index(req, res) {
        let checkData = await self.checkData(req.body);
        if (checkData === false) {
            // return false;
            res.status(400).json({
                Success: false,
                Items: "End search validity"
            });
        } else {
            let request = req.body;
            let insertPassenger = await self.insertPassenger(request);
            request.TravelerInfo = insertPassenger.data.Passengers.TravelerInfo;
            let updateStatus = await self.updateBookData('bookRequest', request, request);
            if (updateStatus.serverStatus === 2) {
                let varInput = await self.getBookData(request);
                let typeQuantity = [];
                varInput.passenger.forEach((element) => {
                    typeQuantity[element.Code] = element.Quantity;
                });
                let outputTravelerRequest = self.getTravelPassenger(request);
                let CHD = typeQuantity.CHD ? typeQuantity.CHD : 0;
                let INF = typeQuantity.INF ? typeQuantity.INF : 0;
                if (typeQuantity.ADT !== outputTravelerRequest.travelerRequest.adult || outputTravelerRequest.travelerRequest.child !== CHD || outputTravelerRequest.travelerRequest.infant !== INF) {
                    res.status(400).json({
                        Success: false,
                        Items: "passenger Count is not equal with passenger count in search request"
                    });
                } else {
                    await self.updateBookData('subsystemBookRequest', varInput.args, request);
                    let varResponse = await self.book(varInput);
                    console.log(99, JSON.stringify(varResponse.Items.data));
                    
                    if (varResponse.Success === false) {
                        res.status(400).json({
                            Success: false,
                            Items: varResponse.Items
                        });
                        // if (response.data && response.data.Success === 'true' && response.data.ConversationId && response.data.ConversationId !== "" &&  response.data.data && response.data.data.PricedItineraries && response.data.data.PricedItineraries.length > 0) {
                        //     for (let i = 0; i < response.data.data.PricedItineraries.length; i++) {
                        //         response.data.data.PricedItineraries[i].ConversationId = response.data.ConversationId;
                        //     }
                        //     responseOutput = response.data.data.PricedItineraries;
                        // }


                    } else if (varResponse.Items.data && varResponse.Items.data.Success === 'true' && varResponse.Items.data.ConversationId && varResponse.Items.data.ConversationId !== "" &&  varResponse.Items.data.data && varResponse.Items.data.data.PricedItineraries && varResponse.Items.data.data.PricedItineraries.length > 0) {
                        try {
                            updateStatus = await self.updateBookData('subsystemBookResponse', varResponse.Items.data, request);
                        } catch (error6) {
                            console.log(error6);
                            console.log(567, varResponse.Items.data);
                        }
                        let otaFormat = ota.ota(varResponse.Items.data.data.PricedItineraries[0], varInput.passenger);
                        gensecClient.organizationCurrency({ OrgId: varInput.firstOrgId }, async (clientError, currencyData) => {
                            if (clientError || currencyData.currencyConvertItems[0].Id === 1) {
                                res.status(400).json({
                                    Success: false,
                                    Items: "problem in get currency"
                                });
                            } else {
                                let varExchanged = await currency.exchange(otaFormat, currencyData.defaultCurrency, currencyData.currencyConvertItems);
                                await self.updateBookData('bookResponse', varExchanged, request);
                                res.json({
                                    Success: true,
                                    Items: varExchanged
                                });
                            }
                        });
                    } else {
                        res.status(400).json({
                            Success: false,
                            Items: "problem in book"
                        });
                           
                    }
                }
            } else {
                res.status(400).json({
                    Success: false,
                    Items: "problem in update request data in database"
                });
            }
        }
    },

    async insertPassenger(request) {
        let results = {};
        try {
            results = await axios.post(global.gensec + '/insertpassengers', { TravelerInfo: request.TravelerInfo }, {
                headers: {
                    'Content-Type': 'application/json',
                    authorization: request.authorization//the token is a variable which holds the token
                }
            });
        } catch (e) {
            console.log(e);
        }

        return results;
    },
    async book(prmInput) {
        let response = {};
        try {
            response = await axios.post(prmInput.searchRequest.WebserviceAuthentication.loginInfo.url + `/api/XmlConnect/FlightPricing`, prmInput.args, { headers: { 
                'Content-Type': 'application/json', 
                'Authorization': 'Bearer ' + prmInput.searchRequest.WebserviceAuthentication.loginInfo.token
            } });
            console.log(JSON.stringify(response.data), 33, JSON.stringify(prmInput.args));
            
            return { Success:true,
                Items:response };
        } catch (error) {
            console.log(error);
            console.log(JSON.stringify(error.response.data));
            
            return { Success:false,
                Items:error.response.data };
        }

    },
    getTravelPassenger(request) {
        let output = {};

        let travelerRequest = {
            adult: 0,
            child: 0,
            infant: 0
        };
        request.TravelerInfo.AirTraveler.forEach((item) => {
            if (item.PassengerTypeCode === 'ADT') {
                travelerRequest.adult += 1;
            } else if (item.PassengerTypeCode === 'CHD') {
                travelerRequest.child += 1;
            } else {
                travelerRequest.infant += 1;
            }
        });
        output = { travelerRequest };

        return output;

    },
    async getBookData(request) {
        let varData = {};
        let row = {};
        let passenger = [];
        let subsystemSearchResponse = {};
        let searchRequest = {};
        let bookRequest = {};
        let firstOrgId = '';
        let subsystemId = 0;
        let firstAccountId = 0;
        try {
            row = await modules.db.query(`SELECT 
            subsystemSearchResponse,
            bookRequest,
            searchRequest,
            searchRequest->>"$.TravelerInfoSummary.AirTravelerAvail.PassengerTypeQuantity" AS passenger,
            searchRequest->>"$.WebserviceAuthentication.firstOrgId" AS firstOrgId,
            searchRequest->>"$.WebserviceAuthentication.subsystemId" AS subsystemId,
            searchRequest->>"$.WebserviceAuthentication.firstAccountId" AS firstAccountId,
            searchResponse->>"$.OriginDestinationInformation.OriginDestinationOption[0].TPA_Extensions.IsForeign" AS IsForeign
            FROM results
            WHERE sessionId = ? AND combinationId = ? AND status <> 'logout'`, [
                uuid.getBinaryUUID(request.AirItinerary.SessionId),
                request.AirItinerary.CombinationId
            ]);

            if (row.length > 0) {
                subsystemSearchResponse = JSON.parse(row[0].subsystemSearchResponse);
                searchRequest = JSON.parse(row[0].searchRequest);
                // if (subsystemBookResponse && subsystemBookResponse.data && subsystemBookResponse.data.orderNum) {
                //     let cancelRequest = {
                //         authentication:subsystemSearchResponse.requestData.priceInput.authentication,
                //         cancel: {
                //             orderNum: subsystemBookResponse.data.orderNum,
                //             virtualPnr: subsystemBookResponse.data.pnr
                //         }
                //     };
                //     try {
                //         await axios.post(bookRequest.WebserviceAuthentication.loginInfo.url + `/json/cancel`, cancelRequest, { headers: { 
                //             'User-Agent': 'Apifox/1.0.0 (https://apifox.com)', 
                //             'Content-Type': 'application/json'
                //         } });
           

                //     } catch (error) {
                //         console.log(error);
            
          
                //     }
                // }
                firstOrgId = row[0].firstOrgId;
                passenger = JSON.parse(row[0].passenger);
                bookRequest = JSON.parse(row[0].bookRequest);
                subsystemId = row[0].subsystemId;
                firstAccountId = row[0].firstAccountId;
                // let AirTravelers = bookRequest.TravelerInfo.AirTraveler;
                // let passengers = [];
                // let adtIndex = [];
                // let infIndex = [];
                // for (let i = 0; i < AirTravelers.length; i++) {
                //     if (AirTravelers[i].PassengerTypeCode === 'ADT') {
                //         adtIndex.push(i + 1);
                //     }
                //     if (AirTravelers[i].PassengerTypeCode === 'INF') {
                //         passengers.push({
                //             passengerIndex : i + 1,
                //             birthday:AirTravelers[i].BirthDate.substring(0, 10),
                //             firstName:AirTravelers[i].PersonName.GivenName,
                //             lastName:AirTravelers[i].PersonName.Surname,
                //             nationality:AirTravelers[i].Document.DocIssueCountry,
                //             psgType:AirTravelers[i].PassengerTypeCode,
                //             sex:AirTravelers[i].Gender === 'Male' ? 'M' : 'F',
                //             associatedPassengerIndex: adtIndex[infIndex.length],
                //             cardType:'P',
                //             cardNum: AirTravelers[i].Document.DocID,
                //             cardExpiredDate:AirTravelers[i].Document.ExpireDate.substring(0, 10)
                //         });
                //         infIndex.push(i);
                //     } else {
                //         passengers.push({
                //             passengerIndex : i + 1,
                //             birthday:AirTravelers[i].BirthDate.substring(0, 10),
                //             firstName:AirTravelers[i].PersonName.GivenName,
                //             lastName:AirTravelers[i].PersonName.Surname,
                //             nationality:AirTravelers[i].Document.DocIssueCountry,
                //             psgType:AirTravelers[i].PassengerTypeCode,
                //             sex:AirTravelers[i].Gender === 'Male' ? 'M' : 'F',
                //             cardType:'P',
                //             cardNum: AirTravelers[i].Document.DocID,
                //             cardExpiredDate:AirTravelers[i].Document.ExpireDate.substring(0, 10)
                            
                //         });

                //     }
                // }
                // varData = {
                //     authentication:subsystemSearchResponse.requestData.priceInput.authentication,
                //     booking:{
                //         passengers,
                //         solution:{
                //             solutionId:subsystemSearchResponse.solutionId,
                //             fareType:subsystemSearchResponse.fareType,
                //             adtFare: subsystemSearchResponse.adtFare,
                //             adtTax: subsystemSearchResponse.adtTax,
                //             chdFare: subsystemSearchResponse.chdFare,
                //             chdTax: subsystemSearchResponse.chdTax,
                //             infFare: subsystemSearchResponse.infFare ? subsystemSearchResponse.infFare : 0,
                //             infTax: subsystemSearchResponse.infTax ? subsystemSearchResponse.infTax : 0,
                //             journeys:subsystemSearchResponse.requestData.priceInput.pricing.journeys
                //         }
                        
                //     }
                // };
                let SegmentOptions = [];
                for (let o = 0; o < subsystemSearchResponse.OriginDestinationOptions.length; o++) {
                    for (let f = 0; f < subsystemSearchResponse.OriginDestinationOptions[o].FlightSegments.length; f++) {
                        SegmentOptions.push({
                            SegmentOptionKey:subsystemSearchResponse.OriginDestinationOptions[o].FlightSegments[f].SegmentOptionKey
                        });
                    }
                }
                
                varData = {
                    Target: searchRequest.WebserviceAuthentication.loginInfo.Target,
                    FareSourceCode:subsystemSearchResponse.AirItineraryPricingInfo.FareSourceCode,
                    ConversationId:subsystemSearchResponse.ConversationId,
                    SegmentOptions
                };
                console.log(90, JSON.stringify(varData));
                
            }
        } catch (e) {
            console.log(e);
        }
        let output = {
            searchRequest,
            passenger,
            args: varData,
            searchRes: subsystemSearchResponse,
            bookRequest,
            firstOrgId,
            subsystemId,
            firstAccountId,
            loginInfo: bookRequest.WebserviceAuthentication.loginInfo
        };
        // console.log(JSON.stringify(output));

        return output;

    },
    async updateBookData(prmField, prmData, request) {
        let row = {};
        try {
            row = await modules.db.query(`UPDATE results SET ` + prmField + ` = ?, status = ?  WHERE sessionId = ? AND combinationId = ?`, [
                JSON.stringify(prmData),
                'booked',
                uuid.getBinaryUUID(request.AirItinerary.SessionId),
                request.AirItinerary.CombinationId
            ]);
        } catch (e) {
            console.log(e);
        }

        return row;
    },
    async bookConfirmPriceChange(loginInfo, flightId) {
        try {
            let data = qs.stringify({
                client_id: loginInfo.client_id,
                client_secret: loginInfo.client_secret,
                userName: loginInfo.userName,
                password: loginInfo.password,
                agencyId: loginInfo.agencyId,
                grant_type: loginInfo.grant_type
            });
            let config = {
                method: 'post',
                url: loginInfo.Url + '/token',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data
            };
            let tokenResponse = await axios(config);
            let axiosResponse = await axios.post(loginInfo.Url + '/api/v3/flight/BookConfirmPriceChange', {
                isConfirm: true,
                flightId
            }, {
                headers: {
                    Authorization: 'Bearer ' + tokenResponse.data.access_token
                }
            });

            return axiosResponse;

        } catch (error) {
            return error;
        }
    },
    async reservationDetails(loginInfo, flightId) {
        try {
            let data = qs.stringify({
                client_id: loginInfo.client_id,
                client_secret: loginInfo.client_secret,
                userName: loginInfo.userName,
                password: loginInfo.password,
                agencyId: loginInfo.agencyId,
                grant_type: loginInfo.grant_type
            });
            let config = {
                method: 'post',
                url: loginInfo.Url + '/token',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data
            };
            let tokenResponse = await axios(config);
            let axiosResponse = await axios.get(loginInfo.Url + '/api/v3/flight/reservationDetails?flightId=' + flightId, {
                headers: {
                    Authorization: 'Bearer ' + tokenResponse.data.access_token
                }
            });

            return axiosResponse.data.result;

        } catch (error) {
            return error;
        }

    }

};
module.exports = self;

