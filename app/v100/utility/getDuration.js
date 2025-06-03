const { DateTime } = require('luxon');
const momentTimezone = require('moment-timezone');
let self = {
    getDuration(origin, destination, arrivallDatetime, departureDatetime) {
        let departureDate = new Date(DateTime.local(arrivallDatetime.getFullYear(), arrivallDatetime.getMonth() + 1, arrivallDatetime.getDate(), arrivallDatetime.getHours(), arrivallDatetime.getMinutes(), arrivallDatetime.getSeconds()).setZone(destination, { keepLocalTime: true }).toString()).getTime();
        let newArrivalDate =  new Date(momentTimezone.tz(departureDate, origin).format('YYYY-MM-DD HH:mm')).getTime();
        let timeDiff = Math.abs(newArrivalDate - departureDatetime.getTime());
        let diffDays = Math.ceil(timeDiff / (1000 * 60));
        
        return diffDays;
    }

};
module.exports = self;