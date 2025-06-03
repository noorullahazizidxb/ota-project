/* eslint-disable complexity */
/* eslint-disable no-undef */
/* eslint-disable max-depth */
/* eslint-disable no-await-in-loop */
/* eslint-disable max-statements */
/* eslint-disable require-unicode-regexp */
const modules = require('../../utility/modules');
let urlModule = require('url');
const lodash = require('lodash');
const uuid = require('../../utility/uuid');
const ota = require('./Ota2017b');
const currency = require('../../utility/currencyExchange');
const citynetTravelUtil = require("citynet-travel-util");
const multiAirport = require("../../utility/multiAirport");
const getCurrency = require("../../utility/getCurrency");
const { default: axios } = require('axios');
const subsystemRabbit = require('../../amqp/client/rabbitmqClient');
async function getResults(prmAgency) {
    let response = {};
    let output = {};
// let Url = new urlModule.URL();
// console.log(new urlModule.URL(prmAgency.Url).origin + '/api/Partners/Flight/Availability/V8/SearchByRouteAndDate');
    // console.log(prmAgency.url + '/api/Partners/Flight/Availability/V8/SearchByRouteAndDate');
    // console.time(prmAgency.url.toString());
    
    try {
        response = await axios.post(prmAgency.url + '/api/Partners/Flight/Availability/V8/SearchByRouteAndDate', {
            UserName: prmAgency.UserName,
            Password: prmAgency.Password,
            OriginIataCode: prmAgency.OriginIataCode,
            DestinationIataCode: prmAgency.DestinationIataCode,
            DepartureDate: prmAgency.DepartureDate,
            DepartureDateWindow: 0,
            FetchSupplierWebserviceFlights: true,
            Language: 'FA'
        });
        // console.timeEnd(prmAgency.url.toString()); 
        output = {
            Success :true,
            request : prmAgency,
            error : null,
            data:response.data 
        };
        // console.log(response);
    } catch (e) {
        // console.timeEnd(prmAgency.url.toString()); 
        // console.log(e);
        output = {
            Success :false,
            request : prmAgency,
            error : e,
            data:null 
        };
    }
    // const mapEssentialInfo = ({volumeInfo}) => ({title: volumeInfo.title});

    return output;
}
async function getSearchInput(prmRequest) {
    let input = [];
    let originDestination = await multiAirport.init(prmRequest.OriginDestinationInformations);
    for (let r = 0; r < prmRequest.WebserviceAuthentication.loginInfo.length; r++) {
        // for (let c = 0; c < classes.length; c++) {
        for (let o = 0; o < originDestination.length; o++) {
            for (let k = 0; k < originDestination[o].length; k++) {
                let originInformation = [];
                originInformation.push(originDestination[o][k]);
                let requestObject = JSON.parse(JSON.stringify(prmRequest));
                requestObject.OriginDestinationInformations = originInformation;
                let obj = {};
                obj.UserName = prmRequest.WebserviceAuthentication.loginInfo[r].UserName;
                obj.url = new urlModule.URL(prmRequest.WebserviceAuthentication.loginInfo[r].Url).origin;
                obj.Password =  prmRequest.WebserviceAuthentication.loginInfo[r].Password;
                obj.OriginIataCode = originDestination[o][k].OriginLocation.LocationCode;
                obj.DestinationIataCode = originDestination[o][k].DestinationLocation.LocationCode;
                obj.DepartureDate =  originDestination[o][k].DepartureDateTime.substr(0, 10);
                // obj.DepartureDateWindow =  0;
                // obj.FetchSupplierWebserviceFlights =  false;
                obj.Language  = 'FA';
                    // obj.offices = row[0][r];
                obj.request = requestObject;

                input.push(obj);
            }
            // }
        }
    }
       
    return input;
}
async function *getSearched(prmList) {
    let currentIndex = 0;
    
    while (currentIndex < prmList.length) {
        const pageResults = await getResults(prmList[currentIndex]);
        yield pageResults;
        currentIndex += 1;
    }
}


async function search(prmList) {
    let inputSearch = await getSearchInput(prmList);
    // console.log(inputSearch);
    
    const pages = getSearched(inputSearch);
    let test = [];
    for await (const page of pages) {
            // console.log('Page Results : ');
            // console.log(page) //
        test.push(page);
    }
        
    return test;
}
function bulkInsert(finalResults, sessionId, prmExchanged, prmRequest) {
    if (finalResults.length > 0) {
        modules.db.query(
                `insert into results (id, sessionId, combinationId, searchRequest, searchResponse, subsystemSearchResponse) values ?`,
            [
                finalResults.map((item, i) => [
                    uuid.createUUID().buffer,
                    sessionId.buffer,
                    i,
                    JSON.stringify(prmRequest),
                    JSON.stringify(prmExchanged[i]),
                    JSON.stringify(item)
                ])
            ]
            );
    }
}
function formatFlightNo(prmResult) {
    for (let i = 0; i < prmResult.length; i++) {
        // console.log(prmResult[i].Airline);
        prmResult[i].originalFlightNo = prmResult[i].FlightNumber;
        prmResult[i].FlightNumber = citynetTravelUtil.formatFlightNo(prmResult[i].FlightNumber, prmResult[i].Airline);
        // eslint-disable-next-line prefer-reflect
        delete prmResult[i].key1;
    }

    return prmResult;
}
function removeDuplicate(prmResult, prmCabinClass) {
    prmResult.sort((a, b) => a.Classes.AdultFare.Payable - b.Classes.AdultFare.Payable);
    // console.log(JSON.stringify(prmResult));
    if (prmCabinClass === 'All') {
        let output = [];
        let varTemp = [];
        let result = lodash.groupBy(prmResult, "Classes.CabinType");
        // eslint-disable-next-line guard-for-in
        for (let key in result) {
            // eslint-disable-next-line no-prototype-builtins
            if (result.hasOwnProperty(key)) {
                varTemp.push(result[key]);
            }
        }
        output = varTemp.map((item) => item.filter((e, i) => item.findIndex((x) => x.FlightNumber === e.FlightNumber && x.Airline === e.Airline) === i));

        return lodash.flatten(output);

    } 
    
    return prmResult.filter((e, i) => prmResult.findIndex((x) => x.FlightNumber === e.FlightNumber && x.Airline === e.Airline && x.Classes.CabinType === prmCabinClass) === i);
}
function getTravelCount(request) {
    let traveler = {
        adult: 1,
        child: 0,
        infant: 0
    };
    request.TravelerInfoSummary.AirTravelerAvail.PassengerTypeQuantity.forEach((item) => {
        if (item.Code === 'ADT') {
            traveler.adult = item.Quantity;
        } else if (item.Code === 'CHD') {
            traveler.child = item.Quantity;
        } else {
            traveler.infant = item.Quantity;
        }
    });

    return traveler;
}
async function index(req, res) {
    let varExchanged = {};
    let request = req.body;
    let evnCheck = 0;
    for (let e = 0; e < request.OriginDestinationInformations.length; e++) {
        // console.log(request);
        if (request.OriginDestinationInformations[e].OriginLocation.LocationCode === 'EVN' || request.OriginDestinationInformations[e].DestinationLocation.LocationCode === 'EVN') {
            evnCheck = 1;
        }
    }
    // console.log(request.payload.orgId, evnCheck);
    if (request.payload.orgId === 13 && evnCheck === 1) {
        res.json({
            Success: true,
            Items: []
        });
    } else {
        // console.time('standardTime');
        let searchResult = await search(request);
        // console.timeEnd('standardTime');
        // console.log(searchResult);
        let output = searchResult.filter((test) => test.Success && (test.data.CharterFlights.length > 0 || test.data.WebserviceFlights.length));
        let currencyDefault = await getCurrency.getDefaultCurrency(request.WebserviceAuthentication.firstOrgId, request.payload.orgId, request.payload.data);
        let travelCount = getTravelCount(request);
        let result = [];
        subsystemRabbit.init({ SubsystemId:request.WebserviceAuthentication.subsystemId }, 'rpc_subsystem',  (msg) => {
            // console.log(msg);
            for (let i = 0; i < output.length; i++) {
                for (let j = 0; j < output[i].data.CharterFlights.length; j++) {
                    for (let k = 0; k < output[i].data.CharterFlights[j].Classes.length; k++) {
                        if (output[i].data.CharterFlights[j].Classes[k].AvailableSeat >= travelCount.adult + travelCount.child && output[i].data.CharterFlights[j].Classes[k].AdultFare.Payable > 0) {
                        
                            let markDown = 0;
                            // console.log(request.WebserviceAuthentication.firstOrgId, results.Origin.Code, results.Destination.Code, results.url, results.url === 'https://apk724.tsptick.ir');
                            if (request.WebserviceAuthentication.firstOrgId === 8 && (output[i].data.CharterFlights[j].Origin.Code === 'NJF' || output[i].data.CharterFlights[j].Destination.Code === 'NJF' || output[i].data.CharterFlights[j].Origin.Code === 'BGW' || output[i].data.CharterFlights[j].Destination.Code === 'BGW')) {
                                markDown = 80000;
                                console.log('ealiya check');
                            }
                            output[i].data.CharterFlights[j].Classes[k].AdultFare.BaseFare  -= markDown;
                            output[i].data.CharterFlights[j].Classes[k].AdultFare.Payable  -= markDown;
                            output[i].data.CharterFlights[j].Classes[k].ChildFare.BaseFare  -= markDown;
                            output[i].data.CharterFlights[j].Classes[k].ChildFare.Payable  -= markDown;
                            result.push({ FlightNumber: output[i].data.CharterFlights[j].FlightNumber,
                                CurrencyCode:output[i].data.CurrencyCode,
                                DepartureDateTime:output[i].data.CharterFlights[j].DepartureDateTime,
                                Origin:output[i].data.CharterFlights[j].Origin,
                                Destination:output[i].data.CharterFlights[j].Destination,
                                Aircraft:output[i].data.CharterFlights[j].Aircraft, 
                                ArrivalDateTime:output[i].data.CharterFlights[j].ArrivalDateTime,
                                Duration:output[i].data.CharterFlights[j].Duration,
                                Airline:output[i].data.CharterFlights[j].Airline,
                                Stop1:output[i].data.CharterFlights[j].Stop1,
                                Stop2:output[i].data.CharterFlights[j].Stop2,
                                Classes:output[i].data.CharterFlights[j].Classes[k],
                                url:output[i].request.url,
                                UserName:output[i].request.UserName,
                                Password:output[i].request.Password,
                                email :msg.defaultEmail,
                                mobile :msg.defaultMobile,
                                webservice:0 }); 
                        }
                    }
                
                }
            
                for (let z = 0; z < output[i].data.WebserviceFlights.length; z++) {
                    for (let c = 0; c < output[i].data.WebserviceFlights[z].Classes.length; c++) {
                        let markDown = 0;
                        // console.log(request.WebserviceAuthentication.firstOrgId, results.Origin.Code, results.Destination.Code, results.url, results.url === 'https://apk724.tsptick.ir');
                        if (request.WebserviceAuthentication.firstOrgId === 8 && (output[i].data.WebserviceFlights[z].Origin.Code === 'NJF' || output[i].data.WebserviceFlights[z].Destination.Code === 'NJF' || output[i].data.WebserviceFlights[z].Origin.Code === 'BGW' || output[i].data.WebserviceFlights[z].Destination.Code === 'BGW')) {
                            markDown = 80000;
                            console.log('ealiya check');
                        }
                        output[i].data.WebserviceFlights[z].Classes[c].AdultFare.BaseFare  -= markDown;
                        output[i].data.WebserviceFlights[z].Classes[c].AdultFare.Payable  -= markDown;
                        output[i].data.WebserviceFlights[z].Classes[c].ChildFare.BaseFare  -= markDown;
                        output[i].data.WebserviceFlights[z].Classes[c].ChildFare.Payable  -= markDown;
                        if (output[i].data.WebserviceFlights[z].Classes[c].AvailableSeat >= travelCount.adult + travelCount.child && output[i].data.WebserviceFlights[z].IsParvazSystemiAirline === false && output[i].data.WebserviceFlights[z].Classes[c].AdultFare.Payable > 0) {
                            result.push({ FlightNumber: output[i].data.WebserviceFlights[z].FlightNumber,
                                CurrencyCode:output[i].data.CurrencyCode,
                                DepartureDateTime:output[i].data.WebserviceFlights[z].DepartureDateTime,
                                Origin:output[i].data.WebserviceFlights[z].Origin,
                                Destination:output[i].data.WebserviceFlights[z].Destination,
                                Aircraft:output[i].data.WebserviceFlights[z].Aircraft, 
                                ArrivalDateTime:output[i].data.WebserviceFlights[z].ArrivalDateTime,
                                Duration:output[i].data.WebserviceFlights[z].Duration,
                                Airline:output[i].data.WebserviceFlights[z].Airline,
                                Stop1:output[i].data.WebserviceFlights[z].Stop1,
                                Stop2:output[i].data.WebserviceFlights[z].Stop2,
                                Classes:output[i].data.WebserviceFlights[z].Classes[c],
                                url:output[i].request.url,
                                UserName:output[i].request.UserName,
                                Password:output[i].request.Password,
                                email :msg.defaultEmail,
                                mobile :msg.defaultMobile,
                                webservice:1 }); 
                        }
                    }
                } 
            }
        
            result = lodash.flatten(lodash.flatten(result)).filter((element) =>  typeof element !== 'undefined');
        // console.log(222, JSON.stringify(result));
            if (result.length > 0) {
                result = formatFlightNo(result);
                result = removeDuplicate(result, request.TravelPreference.CabinPref.Cabin);
                let sessionId = uuid.createUUID();
                ota.ota(result, request, sessionId, async (error, otaResponse) => {
                    if (error) console.log(error);
                    if (otaResponse[0]) {
                        let currencyData = await getCurrency.getCurrencyData(request.WebserviceAuthentication.firstOrgId, request.payload.orgId, request.authorization);
                        varExchanged =  await currency.exchange(otaResponse, currencyDefault.defaultCurrency, currencyData, "search");
                        bulkInsert(result, sessionId, varExchanged, request);
                    } else {
                        varExchanged = [];
                    }   
                    // console.log(varExchanged);
                    res.json({
                        Success: true,
                        Items: varExchanged
                    });
                });
            } else {
                res.json({
                    Success: true,
                    Items: []
                });
            }
        });
    }

    
}
module.exports = { index };
