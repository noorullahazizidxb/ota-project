/* eslint-disable global-require */
/* eslint-disable-next-line global-require */
require('events').EventEmitter.defaultMaxListeners = Infinity;
module.exports = {
    db : require("../../../db"),
    dbRo : require("../../../dbRo"),
    debug: require('debug')('app'),   // debugging instead of console logging
    // // soap : require('node-soap'),
    fs : require("fs")

    /* some other modules you want */
};
