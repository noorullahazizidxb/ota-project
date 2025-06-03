// const axios = require('axios');
const lodash = require('lodash');
const citynetGlobalUtl = require('citynet-global-util');
let self = {
    exchange (prmResults, prmToCurrency, prmCurrency, type = null) {
        let roe  = {};
        //console.log(prmResults);
        let currentCurrency = '';
        if (type === "search") {
            currentCurrency = prmResults[0].AirItineraryPricingInfo.ItinTotalFare.Currency;
        } else {
            currentCurrency = prmResults.AirItineraryPricingInfo.ItinTotalFare.Currency;
        }
        if (currentCurrency ===  prmToCurrency) {
            
            return prmResults;
        } 
        roe = lodash.find(prmCurrency, {
            'ToCurrencyAbb': prmToCurrency,
            'FromCurrencyAbb': currentCurrency
        });
        if (roe) {
            return self.init(prmResults, roe, type);
        }
        
        return prmResults;
    },
    init (prmResults, prmRoe, type) {
        let amount = prmRoe.AmountDecimal;
        if (type === "search") {
            prmResults.forEach((item) => {
                if (item.AirItineraryPricingInfo !== 'undefined') {
                    item.AirItineraryPricingInfo.ItinTotalFare.BaseFare = citynetGlobalUtl.round(item.AirItineraryPricingInfo.ItinTotalFare.BaseFare * amount, prmRoe.ToCurrencyAbb);
                    item.AirItineraryPricingInfo.ItinTotalFare.TotalFare = citynetGlobalUtl.round(item.AirItineraryPricingInfo.ItinTotalFare.TotalFare * amount, prmRoe.ToCurrencyAbb);
                    item.AirItineraryPricingInfo.ItinTotalFare.Original = citynetGlobalUtl.round(item.AirItineraryPricingInfo.ItinTotalFare.Original * amount, prmRoe.ToCurrencyAbb);
                    item.AirItineraryPricingInfo.ItinTotalFare.TotalCommission = citynetGlobalUtl.round(item.AirItineraryPricingInfo.ItinTotalFare.TotalCommission * amount, prmRoe.ToCurrencyAbb);
                    item.AirItineraryPricingInfo.ItinTotalFare.TotalTax = citynetGlobalUtl.round(item.AirItineraryPricingInfo.ItinTotalFare.TotalTax * amount, prmRoe.ToCurrencyAbb);
                    item.AirItineraryPricingInfo.ItinTotalFare.ServiceTax = citynetGlobalUtl.round(item.AirItineraryPricingInfo.ItinTotalFare.ServiceTax * amount, prmRoe.ToCurrencyAbb);
                    item.AirItineraryPricingInfo.ItinTotalFare.Currency = prmRoe.ToCurrencyAbb;
                    item.AirItineraryPricingInfo.PTC_FareBreakdowns.forEach((element) => {
                        element.PassengerFare.BaseFare = citynetGlobalUtl.round(element.PassengerFare.BaseFare * amount, prmRoe.ToCurrencyAbb);
                        element.PassengerFare.TotalFare = citynetGlobalUtl.round(element.PassengerFare.TotalFare * amount, prmRoe.ToCurrencyAbb);
                        element.PassengerFare.Commission = citynetGlobalUtl.round(element.PassengerFare.Commission * amount, prmRoe.ToCurrencyAbb);
                        element.PassengerFare.ServiceTax = citynetGlobalUtl.round(element.PassengerFare.ServiceTax * amount, prmRoe.ToCurrencyAbb);
                        element.PassengerFare.Taxes = citynetGlobalUtl.round(element.PassengerFare.Taxes * amount, prmRoe.ToCurrencyAbb);
                        element.PassengerFare.Original = citynetGlobalUtl.round(element.PassengerFare.Original * amount, prmRoe.ToCurrencyAbb);
                        element.PassengerFare.Currency = prmRoe.ToCurrencyAbb;
                    });
                }
            });
        } else if (prmResults.AirItineraryPricingInfo !== 'undefined') {
            prmResults.AirItineraryPricingInfo.ItinTotalFare.BaseFare = citynetGlobalUtl.round(prmResults.AirItineraryPricingInfo.ItinTotalFare.BaseFare * amount, prmRoe.ToCurrencyAbb);
            prmResults.AirItineraryPricingInfo.ItinTotalFare.TotalFare = citynetGlobalUtl.round(prmResults.AirItineraryPricingInfo.ItinTotalFare.TotalFare * amount, prmRoe.ToCurrencyAbb);
            prmResults.AirItineraryPricingInfo.ItinTotalFare.Original = citynetGlobalUtl.round(prmResults.AirItineraryPricingInfo.ItinTotalFare.Original * amount, prmRoe.ToCurrencyAbb);
            prmResults.AirItineraryPricingInfo.ItinTotalFare.TotalCommission = citynetGlobalUtl.round(prmResults.AirItineraryPricingInfo.ItinTotalFare.TotalCommission * amount, prmRoe.ToCurrencyAbb);
            prmResults.AirItineraryPricingInfo.ItinTotalFare.TotalTax = citynetGlobalUtl.round(prmResults.AirItineraryPricingInfo.ItinTotalFare.TotalTax * amount, prmRoe.ToCurrencyAbb);
            prmResults.AirItineraryPricingInfo.ItinTotalFare.ServiceTax = citynetGlobalUtl.round(prmResults.AirItineraryPricingInfo.ItinTotalFare.ServiceTax * amount, prmRoe.ToCurrencyAbb);
            prmResults.AirItineraryPricingInfo.ItinTotalFare.Currency = prmRoe.ToCurrencyAbb;
            prmResults.AirItineraryPricingInfo.PTC_FareBreakdowns.forEach((element) => {
                element.PassengerFare.BaseFare = citynetGlobalUtl.round(element.PassengerFare.BaseFare * amount, prmRoe.ToCurrencyAbb);
                element.PassengerFare.TotalFare = citynetGlobalUtl.round(element.PassengerFare.TotalFare * amount, prmRoe.ToCurrencyAbb);
                element.PassengerFare.Commission = citynetGlobalUtl.round(element.PassengerFare.Commission * amount, prmRoe.ToCurrencyAbb);
                element.PassengerFare.ServiceTax = citynetGlobalUtl.round(element.PassengerFare.ServiceTax * amount, prmRoe.ToCurrencyAbb);
                element.PassengerFare.Taxes = citynetGlobalUtl.round(element.PassengerFare.Taxes * amount, prmRoe.ToCurrencyAbb);
                element.PassengerFare.Original = citynetGlobalUtl.round(element.PassengerFare.Original * amount, prmRoe.ToCurrencyAbb);
                element.PassengerFare.Currency = prmRoe.ToCurrencyAbb;
            });
        }
        
        return prmResults;
    }
};
module.exports = self;