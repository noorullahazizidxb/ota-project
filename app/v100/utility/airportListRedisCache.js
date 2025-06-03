const redis = require('../../../redis');
const modules = require('./modules');
// let request = {};
let self = {
    async cacheSynchronize(prmAirportCode) {
        // let redis = redis.getConnection();
        let check = await redis.hexists(prmAirportCode, 'airportCode');
        // console.log(check);
        if (check > 0) {
            // console.log(redis.hgetall(prmAirportCode, 'airportCode'));
            let output = await redis.hgetall(prmAirportCode);
            
            return output;
        } 
        let airports = await self.getDataFromMysql(prmAirportCode);
        if (airports.length > 0) {
            await redis.hset(
                airports[0].airportCode, 
                'priority', airports[0].priority,
                'count', airports[0].count,
                'countryNameEn', airports[0].countryNameEn,
                'countryNameFa', airports[0].countryNameFa,
                'countryCode', airports[0].countryCode,
                'cityNameEn', airports[0].cityNameEn,
                'cityNameFa', airports[0].cityNameFa,
                'cityCode', airports[0].cityCode,
                'airportNameEn', airports[0].en,
                'airportNameFa', airports[0].fa,
                'airportCode', airports[0].airportCode,
                'timeZone', airports[0].timeZone,
                'gmt', airports[0].gmt,
                'dst', airports[0].dst
            );
            
            return {
                'priority': airports[0].priority,
                'count': airports[0].count,
                'countryNameEn': airports[0].countryNameEn,
                'countryNameFa': airports[0].countryNameFa,
                'countryCode': airports[0].countryCode,
                'cityNameEn': airports[0].cityNameEn,
                'cityNameFa': airports[0].cityNameFa,
                'cityCode': airports[0].cityCode,
                'airportNameEn': airports[0].en,
                'airportNameFa': airports[0].fa,
                'airportCode': airports[0].airportCode,
                'timeZone': airports[0].timeZone,
                'gmt': airports[0].gmt,
                'dst': airports[0].dst
            };
        } 
        
        return {
            'priority': '',
            'count': '',
            'countryNameEn': '',
            'countryNameFa': '',
            'countryCode': '',
            'cityNameEn': '',
            'cityNameFa': '',
            'cityCode': '',
            'airportNameEn': '',
            'airportNameFa': '',
            'airportCode': '',
            'timeZone': 'Asia/Tehran',
            'gmt': '',
            'dst': ''
        };
        
       
    },
    cache(prmAirportCode, callback) {
        // let redis = redis.getConnection();
        let airports = [];
        redis.hexists(prmAirportCode, 'airportCode', async  (err, check) => {
            if (err) console.log(err);
            // console.log(check);
            
            if (check > 0) {
                redis.hgetall(prmAirportCode, (error, result) => {
                    if (error) console.log(error);
                    callback(error, result);
                });
            } else {
                airports = await self.getDataFromMysql(prmAirportCode);
                // console.log(airports);
                
                if (airports.length > 0) {
                    await redis.hset(
                        airports[0].airportCode, 
                        'priority', airports[0].priority,
                        'count', airports[0].count,
                        'countryNameEn', airports[0].countryNameEn,
                        'countryNameFa', airports[0].countryNameFa,
                        'countryCode', airports[0].countryCode,
                        'cityNameEn', airports[0].cityNameEn,
                        'cityNameFa', airports[0].cityNameFa,
                        'cityCode', airports[0].cityCode,
                        'airportNameEn', airports[0].en,
                        'airportNameFa', airports[0].fa,
                        'airportCode', airports[0].airportCode,
                        'timeZone', airports[0].timeZone,
                        'gmt', airports[0].gmt,
                        'dst', airports[0].dst
                    );
                    callback(null, {
                        'priority': airports[0].priority,
                        'count': airports[0].count,
                        'countryNameEn': airports[0].countryNameEn,
                        'countryNameFa': airports[0].countryNameFa,
                        'countryCode': airports[0].countryCode,
                        'cityNameEn': airports[0].cityNameEn,
                        'cityNameFa': airports[0].cityNameFa,
                        'cityCode': airports[0].cityCode,
                        'airportNameEn': airports[0].en,
                        'airportNameFa': airports[0].fa,
                        'airportCode': airports[0].airportCode,
                        'timeZone': airports[0].timeZone,
                        'gmt': airports[0].gmt,
                        'dst': airports[0].dst
                    });
                } else {
                    callback(null, {
                        'priority': '',
                        'count': '',
                        'countryNameEn': '',
                        'countryNameFa': '',
                        'countryCode': '',
                        'cityNameEn': '',
                        'cityNameFa': '',
                        'cityCode': '',
                        'airportNameEn': '',
                        'airportNameFa': '',
                        'airportCode': '',
                        'timeZone': 'Asia/Tehran',
                        'gmt': '',
                        'dst': ''
                    });
                }
                
            }
        });
        
    },
    async getDataFromMysql(prmAirportCode) {
        let row =  await modules.dbRo.query(`select * from gensec.viwAirports where airportCode = ?`, [prmAirportCode]);

        return row;
    }
};

module.exports = self;
