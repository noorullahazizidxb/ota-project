const airportTimezone = require('airport-timezone');
const { DateTime } = require('luxon');
const momentTimezone = require('moment-timezone');
// let request = {};
let self = {
    async getduration(origin, destination, arivallDatetime, departureDatetime) {
        // console.log(typeof arivallDatetime);
        // console.log(arivallDatetime);
        // let ari = new Date(Date.parse(arivallDatetime) * 1000);
        // let dep = new Date(Date.parse(departureDatetime) * 1000);
        let fromAirportGmt = await airportTimezone.filter((airport) => airport.code === origin)[0].timezone;
        let toAirportGmt = await airportTimezone.filter((airport) => airport.code === destination)[0].timezone;
        console.log(fromAirportGmt, toAirportGmt);
        let departureDate = new Date(DateTime.local(arivallDatetime.getFullYear(), arivallDatetime.getMonth() + 1, arivallDatetime.getDate(), arivallDatetime.getHours(), arivallDatetime.getMinutes(), arivallDatetime.getSeconds()).setZone(toAirportGmt, { keepLocalTime: true }).toString()).getTime();
        // let departureDate = new Date(DateTime.local(arivallDatetime).setZone(toAirportGmt, { keepLocalTime: true }).toString()).getTime();
        
        let newAriivalDate =  new Date(momentTimezone.tz(departureDate, fromAirportGmt).format('YYYY-MM-DD HH:mm')).getTime();
        // let departureDate = new Date(DateTime.local(departureDatetime.getFullYear(), departureDatetime.getMonth() + 1, departureDatetime.getDate(), departureDatetime.getHours(), departureDatetime.getMinutes(), departureDatetime.getSeconds()).setZone(fromAirportGmt, { keepLocalTime: true }).toString()).getTime() + request.Duration * 60000;
        // let ArivallDatetime = momentTimezone.tz(departureDate, toAirportGmt).format('YYYY-MM-DD HH:mm');
        let timeDiff = Math.abs(newAriivalDate - departureDatetime.getTime());
        let diffDays = Math.ceil(timeDiff / (1000 * 60));
        
        return diffDays;
        
    }

};
module.exports = self;