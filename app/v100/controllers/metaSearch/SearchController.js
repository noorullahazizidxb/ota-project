// const lodash = require('lodash');
// const redis2 = require('../../../../redis2');
// const currency = require('../../utility/currencyExchange');
// const ota = require('./Ota2017b');
// const moment = require('moment');
let self = {
    index(req, res) {
        // let varExchanged = {};
        // let request = req.body;
        // let result = {};
        // let isExist = await redis2.exists('niraSystemCache');
        // console.log(request.StartDate.toISOString());
        // if (isExist === 1) {
        //     // result = await redis2.zrangebyscore('niraSystemCache', request.StartDate.replace(/-/ug, ''), request.EndDate.replace(/-/ug, ''));
            
        //     result = await redis2.zrangebyscore('mahanSystemCache', moment(request.StartDate).format('YYYYMMDD'), moment(request.EndDate).format('YYYYMMDD'));
        //     result = result.map((item) => JSON.parse(item));
            // result = lodash.remove(result, (obj) => !request.WebserviceAuthentication.loginInfo.airlines.includes(obj.airline));//remove airline exclude from airline list
            // ota.ota(result, async (error, otaResponse) => {
                // if (error) console.log(error);
                // console.log(otaResponse);
                // varExchanged =  await currency.exchange(otaResponse, request.payload.data.defaultCurrency, request.authorization);
        res.json({
            Success: true,
            Items: []
        });
        //     });
        // }
       
    }
};
module.exports = self;
