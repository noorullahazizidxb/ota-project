/* eslint-disable max-statements */
/* eslint-disable camelcase */
const moment = require('moment');
let self = {
    ota(result, prmPassenger) {
        let ttl = moment().add(20, 'Minutes').format('YYYY-MM-DDTHH:mm:ss');
        
        //let results = self.setPrice(prmSearchRes);
        let ID_Context = result.pnr;

        /*if (webservice === 0) {
            if (prmSearchRes.Count === 2) {
                ID_Context = prmResults.DepartureSegmentLockId.toString() + ',' + prmResults.ReturningSegmentLockId.toString();
            } else {
                ID_Context = prmResults.DepartureSegmentLockId.toString();
            }
        }*/

        return {
            AirReservation: {
                BookingReferenceID: {
                    TicketTimeLimit:ttl,
                    TicketType: "LockingOnly"
                },
                Ticketing: {
                    type: "Lock",
                    ID_Context
                }
            },
            AirItineraryPricingInfo: { 
                ItinTotalFare: self.getItinerary(result.AirItineraryPricingInfo),
                PTC_FareBreakdowns: self.getFareBreakdowns(result.AirItineraryPricingInfo, prmPassenger)
            }
        };
    },
    
    getItinerary(result) {
        return {
            BaseFare: result.ItinTotalFare.BaseFare.Amount,
            TotalFare:result.ItinTotalFare.TotalFare.Amount,
            Original: 0,
            // adultCommission * adult + childCommission * child + infantCommission * infant
            TotalCommission: 0,
            TotalTax: result.ItinTotalFare.TotalTax.Amount,
            ServiceTax: 0,
            Currency:result.ItinTotalFare.BaseFare.CurrencyCode
        };
    },
    getFareBreakdowns(result, passenger) {
        let output = [];
        // console.log(result.PTC_FareBreakdowns);
        passenger.forEach((item) => {
            let PTCArray = result.PTC_FareBreakdowns.filter((PTCItem) => PTCItem.PassengerTypeQuantity.Code === item.Code);
            
            if (PTCArray.length > 0) {
               

                output.push({
                    PassengerFare: {
                        BaseFare: PTCArray[0].PassengerFare.BaseFare.Amount,
                        TotalFare:PTCArray[0].PassengerFare.TotalFare.Amount,
                        Original: 0,
                        // adultCommission * adult + childCommission * child + infantCommission * infant
                        Commission: 0,
                        Taxes: PTCArray[0].PassengerFare.TotalTax.Amount,
                        ServiceTax: 0,
                        Currency:PTCArray[0].PassengerFare.BaseFare.CurrencyCode
                    },
                    PassengerTypeQuantity: {
                        Code:  item.Code,
                        Quantity: item.Quantity
                    }
                });
            } else {
                output.push({
                    PassengerFare: {
                        BaseFare: 0,
                        TotalFare:0,
                        Original: 0,
                        // adultCommission * adult + childCommission * child + infantCommission * infant
                        Commission: 0,
                        Taxes: 0,
                        ServiceTax: 0,
                        Currency:''
                    },
                    PassengerTypeQuantity: {
                        Code:  item.Code,
                        Quantity: item.Quantity
                    }
                });
            }
        });

        return output;
    }
};
module.exports = self;
