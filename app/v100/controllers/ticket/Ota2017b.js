/* eslint-disable camelcase */
// const moment = require('moment');
// const lodash = require('lodash');
let self = {
    ota(prmAirItinerary, prmTravelers) {
        let output  = {
            AirItinerary: prmAirItinerary,
            TravelerInfo: prmTravelers
        };

        return output;
    }
};
module.exports = self;