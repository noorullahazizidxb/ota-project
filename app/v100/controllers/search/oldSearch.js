/* eslint-disable require-unicode-regexp */
const modules = require('../../utility/modules');
const async = require('async');
var urlModule = require('url');
const lodash = require('lodash');
const uuid = require('../../utility/uuid');
const ota = require('./Ota2017b');
const currency = require('../../utility/currencyExchange');
const citynetTravelUtil = require("citynet-travel-util");
// const axios = require('axios');
const multiAirport = require("../../utility/multiAirport");
const getCurrency = require("../../utility/getCurrency");


let self = { 
    async index(req, res) {

        let varExchanged = {};
        let request = req.body;
        let args = await self.getSearchInput(request);
        try {
            async.map(args, self.getAvailability, (err, results) => {
                if (err) console.log(err);

                let result = lodash.flatten(results);

                result = self.formatFlightNo(result);
    
                result = self.removeDuplicate(result, request.TravelPreference.CabinPref.Cabin);
                // console.log(result);
                let sessionId = uuid.createUUID();
                ota.ota(result, request, sessionId, async (error, otaResponse) => {
                    if (error) console.log(error);
                    if (otaResponse[0]) {
                        let currencyData = await getCurrency.getCurrencyData(request.WebserviceAuthentication.firstOrgId, request.payload.orgId, request.authorization);
                        let currencyDefault = await getCurrency.getDefaultCurrency(request.WebserviceAuthentication.firstOrgId, request.payload.orgId, request.payload.data.defaultCurrency);
        
                        varExchanged =  await currency.exchange(otaResponse, currencyDefault, currencyData, "search");
                        self.bulkInsert(result, sessionId, varExchanged, request);
                    } else {
                        varExchanged = [];
                    }   

                    res.json({
                        Success: true,
                        Items: varExchanged
                    });
                });
            });
        } catch (e) {
            res.status(400).json({
                Success: false,
                Items: 'unknown error'
            });        
        }
      
    },
    getAvailability(item, callback) {
       
        modules.db.query(
            `call prcSearch(?, ?, ?, ?, ?, ?)`,
            [
                item.origin,
                item.destination,
                item.DepartureDateTime,
                item.adult,
                item.child,
                item.username.join()
            ],
            (err, row) => {
                if (err) console.log(err);
                callback(null, row[0]);
            }
        );
    },
    removeDuplicate(prmResult, prmCabinClass) {
        
        if (prmCabinClass === 'All') {
            let output = [];
            let varTemp = [];
            let result = lodash.groupBy(prmResult, "cabinClass");
            // eslint-disable-next-line guard-for-in
            for (let key in result) {
                // eslint-disable-next-line no-prototype-builtins
                if (result.hasOwnProperty(key)) {
                    varTemp.push(result[key]);
                }
            }
            output = varTemp.map((item) => item.filter((e, i) => item.findIndex((x) => x.flightNo === e.flightNo && x.iata === e.iata) === i));

            return lodash.flatten(output);

        } 
        
        return prmResult.filter((e, i) => prmResult.findIndex((x) => x.flightNo === e.flightNo && x.iata === e.iata && x.cabinClass === prmCabinClass) === i);
    },
    formatFlightNo(prmResult) {
        for (let i = 0; i < prmResult.length; i++) {
            prmResult[i].originalFlightNo = prmResult[i].flightNo;
            prmResult[i].flightNo = citynetTravelUtil.formatFlightNo(prmResult[i].flightNo, prmResult[i].iata);
            // eslint-disable-next-line prefer-reflect
            delete prmResult[i].key1;
        }

        return prmResult;
    },
    
        // adultServiceTax = results.adultFee === null ? 0 : results.adultFee;
        // childServiceTax = results.childFee === null ? 0 : results.childFee;
        // infantServiceTax = results.infantFee === null ? 0 : results.infantFee;,
    async getSearchInput(request) {
        let output = [];

        let traveler = self.getTravelCount(request);
        let username = self.getAgencyUsers(request);

        let originDestination = await multiAirport.init(request.OriginDestinationInformations);
        // console.log(JSON.stringify(originDestination));

        for (let o = 0; o < originDestination.length; o++) {
            for (let r = 0; r < originDestination[o].length; r++) {
                output.push({
                    origin: originDestination[o][r].OriginLocation.LocationCode,
                    destination: originDestination[o][r].DestinationLocation.LocationCode,
                    DepartureDateTime: originDestination[o][r].DepartureDateTime.substr(0, 10),
                    adult: traveler.adult,
                    child: traveler.child,
                    infant: traveler.infant,
                    username
                });
            }
        }


        if (request.payload.orgId === 13) {
            return output.filter((item) => item.origin !== "EVN" && item.destination !== "EVN");
        } 

        return output;
    },
    getAgencyUsers(request) {
        let agencies = [];
        var urlObject = {};
        request.WebserviceAuthentication.loginInfo.forEach((item) => {
            urlObject = urlModule.parse(item.Url, true);
            if (item.IsHub === 1) {
                agencies.push('hub-' + urlObject.hostname);
            } else {
                agencies.push(item.UserName  + '-' + urlObject.hostname);
            }
        });
        
        return agencies;
    },
    getTravelCount(request) {
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
    
};
module.exports = self;
