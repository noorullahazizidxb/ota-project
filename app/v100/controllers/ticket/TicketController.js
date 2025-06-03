/* eslint-disable max-depth */
/* eslint-disable complexity */
/* eslint-disable max-statements */
const modules = require('../../utility/modules');
const uuid = require('../../utility/uuid');
const axios = require('axios');
const ota = require('./Ota2017b');
const token = require("./../token/Token");
const moment = require('moment');
let self = {
    async index(req, res) {
        let request = req.body;
        let updateRequest = await self.updateTicketData('ticketRequest', request, request);
        if (updateRequest.serverStatus === 2) {
            let varInput = await self.getTicketData(request);
            console.log(varInput);
            
            await self.updateTicketData('subsystemTicketRequest', varInput.input, request);
            if (varInput.success === true) {
                let lastResponse = {};
                // success,
                // message,
                // orderPricingInput,
                // ticketingInput,
                // orderDetailInput,
                // bookRequest
                let response = {};
                console.log("🚀 ~ varInput.input:", JSON.stringify(varInput.input));
                try {
                    response = await axios.post(varInput.searchRequest.WebserviceAuthentication.loginInfo.url + `/api/XmlConnect/Book`, varInput.input, { headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': 'Bearer ' + varInput.searchRequest.WebserviceAuthentication.loginInfo.token
                    } });

                } catch (ticketResponseError) {
                    console.log('ticketResponseError:', ticketResponseError);
                }

                console.log("🚀 ~ index ~ response.data:", JSON.stringify(response.data));
                if (response && response.data && (response.data.Success === 'true' || response.data.Success === true)  && response.data.Data && response.data.Data.BookingStatus === 'Confirmed') {
                    if (response.data.Data.TicketingStatus === 'TicketInProcess') {
                        await self.updateTicketData('subsystemTicketResponse', { data:response.data }, request);
                        for (let i = 0; i < varInput.bookRequest.TravelerInfo.AirTraveler.length; i++) {
                            varInput.bookRequest.TravelerInfo.AirTraveler[i].ReferenceId = response.data.Data.UniqueID;
                            varInput.bookRequest.TravelerInfo.AirTraveler[i].TicketNumber = ['In Progress'];
                        }
                        let otaFormat = ota.ota(request.AirItinerary, varInput.bookRequest.TravelerInfo);
                        await self.updateTicketData('ticketResponse', otaFormat, request);
                        res.json({
                            Success: true,
                            Items: otaFormat
                        }); 

                    } else if (response.data.Data.TicketingStatus === 'Pending') {
                        let ticResponse = {};
                        try {
                            ticResponse = await axios.post(varInput.searchRequest.WebserviceAuthentication.loginInfo.url + `/api/XmlConnect/FlightTicket`, {
                                referenceNumber:response.data.Data.ReferenceNumber,
                                Target:varInput.searchRequest.WebserviceAuthentication.loginInfo.Target
                            }, { headers: { 
                                'Content-Type': 'application/json', 
                                'Authorization': 'Bearer ' + varInput.searchRequest.WebserviceAuthentication.loginInfo.token
                            } });
        
                        } catch (ticket1ResponseError) {
                            console.log('ticketResponseError:', ticket1ResponseError);
                        }
                        await self.updateTicketData('subsystemTicketResponse', { data:response.data,
                            data1:ticResponse.data }, request);
                        if (ticResponse && ticResponse.data && (ticResponse.data.Success === 'true' || ticResponse.data.Success === true)) {
                            
                            for (let i = 0; i < varInput.bookRequest.TravelerInfo.AirTraveler.length; i++) {
                                varInput.bookRequest.TravelerInfo.AirTraveler[i].ReferenceId = response.data.Data.UniqueID;
                                varInput.bookRequest.TravelerInfo.AirTraveler[i].TicketNumber = ['In Progress'];
                            }
                            let otaFormat = ota.ota(request.AirItinerary, varInput.bookRequest.TravelerInfo);
                            await self.updateTicketData('ticketResponse', otaFormat, request);
                            res.json({
                                Success: true,
                                Items: otaFormat
                            }); 
                        } else {
                            for (let i = 0; i < varInput.bookRequest.TravelerInfo.AirTraveler.length; i++) {
                                varInput.bookRequest.TravelerInfo.AirTraveler[i].ReferenceId = 'inprocess';
                                varInput.bookRequest.TravelerInfo.AirTraveler[i].TicketNumber = ['inprocess'];
                            }
                            let otaFormat = ota.ota(request.AirItinerary, varInput.bookRequest.TravelerInfo);
                            await self.updateTicketData('ticketResponse', otaFormat, request);
                            res.json({
                                Success: true,
                                Items: otaFormat
                            }); 
                        }

                    } else {
                        await self.updateTicketData('subsystemTicketResponse', response.data, request);
                        res.status(400).json({
                            Success: false,
                            Items: "ticketingError"
                        });
                    }

                } else {
                    await self.updateTicketData('subsystemTicketResponse', response.data, request);
                    await self.updateTicketData('subsystemTicketResponse', lastResponse, request);
                    await self.updateTicketData('ticketResponse', {
                        Success: false,
                        Items: "ticketingError"
                    }, request);
                    res.status(400).json({
                        Success: false,
                        Items: "ticketingError"
                    });
                }
            } else {
                await self.updateTicketData('subsystemTicketResponse', lastResponse, request);
                await self.updateTicketData('ticketResponse', {
                    Success: false,
                    Items: "changePrice"
                }, request);
                res.status(400).json({
                    Success: false,
                    Items: "changePrice"
                });
            }

        } else {
            await self.updateTicketData('subsystemTicketResponse', lastResponse, request);
            await self.updateTicketData('ticketResponse', {
                Success: false,
                Items: "problem in check orderNumber"
            }, request);
            res.status(400).json({
                Success: false,
                Items: "problem in check orderNumber"
            });
        }
        
        
    },
    async ticket(prmInput, prmLoginInfo) {


        let varResponse = {};
        try {
            // let tokenResponse = await axios(config);
            let tokenResponse = await token.getToken(prmLoginInfo);
            if (tokenResponse === -1) {
                return null;
            }
            varResponse = await axios.post(prmLoginInfo.Url + `/api/v3/flight/issue`, {
                invoiceId: prmInput.invoiceId
            }, {
                headers: {
                    'Authorization': 'Bearer ' + tokenResponse
                }
            });

        } catch (e) {
            //console.log(JSON.stringify(e.data));

            return e.response;
        }

        return varResponse;
    },
    checkPrice(oldPrice, newPrice) {
        if (oldPrice.adtFare === newPrice.adtFare && oldPrice.currency === newPrice.currency && oldPrice.adtTax === newPrice.adtTax && (!newPrice.chdFare || oldPrice.chdFare === newPrice.chdFare &&
            oldPrice.chdTax === newPrice.chdTax) &&
            (!newPrice.infFare || oldPrice.infFare === newPrice.infFare && oldPrice.infTax === newPrice.infTax)

        ) {
            return true;
        } 
        
        return false;
    },
    async getData(request) {
        let row = [];

        try {
            row = await modules.db.query(`SELECT 
            id,
            ifnull(subsystemBookResponse, JSON_OBJECT()) as subsystemBookResponse,
            subsystemSearchResponse,
            searchRequest,
            subsystemSearchResponse AS subsystemSearchResponse ,
            bookRequest
            FROM results
            WHERE sessionId = ? AND combinationId = ? AND status <> 'logout'`, [
                uuid.getBinaryUUID(request.AirItinerary.SessionId),
                request.AirItinerary.CombinationId
            ]);
        } catch (e) {
            console.log(e);
        }

        return row[0];
    },
    checkMobileAndEmail(varInput, request, callback) {
        if (parseInt(varInput.searchRes.systemDefaultData, 10) === 0) {
            let passengerMobile = request.Contacts.filter((passengerMobileItem) => passengerMobileItem.SendToProvider === true);
            if (passengerMobile.length > 0) {
                if (passengerMobile[0].Email !== '' && passengerMobile[0].Email !== null) {
                    varInput.args.buyer.email = passengerMobile[0].Email;
                } else if (request.payload.email !== '') {
                    varInput.args.buyer.email = request.payload.email;
                }
            } else if (request.payload.email !== '') {
                varInput.args.buyer.email = request.payload.email;
            }
            callback(varInput);
        
        } else {
            callback(varInput);
        }
    },
    setDataOfTravelers(prmTravelers, IsForeign) {
        let AdultPassengers = [];
        let ChildPassengers = [];
        let InfantPassengers = [];
        prmTravelers.AirTraveler.forEach((element) => {
            let Passport = null;
            let IranianCartMelli = null;
            if (IsForeign === 'true' || IsForeign === true || element.Document.DocIssueCountry !== "IR") {
                Passport = {
                    Number: element.Document.DocID,
                    ExpiryDate: element.Document.ExpireDate.substr(0, 10),
                    NationalityCountryCode: element.Document.DocIssueCountry,
                    PlaceOfIssueCountryCode: element.Document.DocIssueCountry
                };
            } else {
                IranianCartMelli = {
                    CodeMelli: element.NationalId
                };
            }
            let passenger = {
                Title: element.PersonName.NamePrefix === 'MR' || element.PersonName.NamePrefix === 'MSTR' ? 'MR' : 'MS',
                FirstName: element.PersonName.GivenName,
                LastName: element.PersonName.Surname,

                BirthDate: element.BirthDate.substr(0, 10),
                IranianCartMelli,
                Passport
            };
            if (element.PassengerTypeCode === 'ADT') {
                AdultPassengers.push(passenger);
            } else if (element.PassengerTypeCode === 'CHD') {
                ChildPassengers.push(passenger);
            } else {
                InfantPassengers.push(passenger);
            }
        });

        return {
            AdultPassengers,
            ChildPassengers,
            InfantPassengers
        };

    },
    async getTicketData(request) {
        let data = await self.getData(request);
        let success = true;
        let message = '';
        let searchRequest = {};
        let bookRequest = {};
        let input = {};
        let subsystemBookResponse = {};
        if (data) {
            let subsystemSearchResponse = JSON.parse(data.subsystemSearchResponse);
            subsystemBookResponse =  JSON.parse(data.subsystemBookResponse);
            bookRequest = JSON.parse(data.bookRequest);
            searchRequest = JSON.parse(data.searchRequest);
            let AirTravelers = [];
            bookRequest.TravelerInfo.AirTraveler.forEach((element) => {
                AirTravelers.push({
                    
                    PassengerType: element.PassengerTypeCode,
                    Gender: element.Gender === 'Male' ? "M" : "F",
                    PassengerName: {
                        PassengerTitle: element.PersonName.NamePrefix,
                        PassengerFirstName: element.PersonName.GivenName,
                        PassengerLastName: element.PersonName.Surname
                    },
                    "DateOfBirth": moment(element.BirthDate).format('DD-MM-YYYY'),
                    Passport: {
                        "PassportNumber": element.Document.DocID,
                        "ExpiryDate":moment(element.Document.ExpireDate).format('DD-MM-YYYY'),
                        "Country": element.Document.DocIssueCountry
                    },
                    "FrequentFlyerNumber": "",
                    "SpecialServiceRequest": {
                        "SeatPreference": "Any",
                        "MealPreference": "Any"
                    },
                    "ExtraServices": null,
                    "PassengerNationality": "IRAN",
                    "KnowTravelerNo": "",
                    "RedressNo": "",
                    "NationalID": ""
                
                });
            });
            
            input = { Target: searchRequest.WebserviceAuthentication.loginInfo.Target,
                FareSourceCode:subsystemBookResponse.data.PricedItineraries[0].AirItineraryPricingInfo.FareSourceCode,
                TravelerInfo:{ AirTravelers,

                    CountryCode: searchRequest.WebserviceAuthentication.loginInfo.CountryCode,
                    AreaCode: searchRequest.WebserviceAuthentication.loginInfo.AreaCode,
                    PhoneNumber:searchRequest.WebserviceAuthentication.loginInfo.PhoneNumber,
                    Email: searchRequest.WebserviceAuthentication.loginInfo.Email,
                    PostCode: searchRequest.WebserviceAuthentication.loginInfo.PostCode } };
                
            // if (subsystemBookResponse && subsystemBookResponse.data && subsystemBookResponse.data.orderNum) {
            //     orderPricingInput = {
            //         authentication:subsystemSearchResponse.requestData.priceInput.authentication,
            //         orderPricing: {
            //             orderNum: subsystemBookResponse.data.orderNum
            //         }
            //     };
            //     let emailRequest = subsystemSearchResponse.email;
            //     let passengerMobile = bookRequest.Contacts.filter((passengerMobileItem) => passengerMobileItem.SendToProvider === true);
            //     if (passengerMobile.length > 0) {
            //         if (passengerMobile[0].Email !== '' && passengerMobile[0].Email !== null) {
            //             emailRequest = passengerMobile[0].Email;
            //         } else if (request.payload.email !== '') {
            //             emailRequest = request.payload.email;
            //         }
            //     } else if (request.payload.email !== '') {
            //         emailRequest = request.payload.email;
            //     }


            //     ticketingInput = {
            //         authentication:subsystemSearchResponse.requestData.priceInput.authentication,
            //         ticketing: {
            //             orderNum: subsystemBookResponse.data.orderNum,
            //             email:emailRequest,
            //             PNR:subsystemBookResponse.data.pnr
            //         }
            //     };
            //     orderDetailInput = {
            //         authentication:subsystemSearchResponse.requestData.priceInput.authentication,
            //         data: {
            //             orderNum: subsystemBookResponse.data.orderNum,
            //             includeFields:"passengers"
            //         }
            //     };
            // } else {
            //     success = false;
            //     message = 'this flight does not have pnr, you must call book method before call ticket method';
            // }
            
        } else {
            success = false;
            message = 'no data was found';
        }
        
        return {
            success,
            message,
            input,
            searchRequest,
           
            bookRequest,
            subsystemBookResponse
        };
    },
    async updateTicketData(prmField, prmResponse, request) {
        let row = {};
        try {
            row = await modules.db.query(`UPDATE results SET ` + prmField + ` = ?, status = ?  WHERE sessionId = ? AND combinationId = ?`, [
                JSON.stringify(prmResponse),
                'ticketed',
                uuid.getBinaryUUID(request.AirItinerary.SessionId),
                request.AirItinerary.CombinationId
            ]);
        } catch (e) {
            console.log(e);
        }

        return row;
    }
};
module.exports = self;