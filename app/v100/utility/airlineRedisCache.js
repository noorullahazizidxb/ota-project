const redis = require('../../../redis');
const modules = require('./modules');
// let request = {};
let self = {
    cache(prmIata, callback) {
        let airlines = [];
        
        redis.hexists(prmIata, 'iata', async  (err, check) => {
            // console.log(check);
            if (err) console.log(err);
            if (check > 0) {
                redis.hgetall(prmIata, (error, result) => {
                    if (error) console.log(error);
                    callback(error, result);
                });
            } else {
                airlines = await self.getDataFromMysql(prmIata);
                if (airlines.length > 0) {
                    await redis.hmset(
                        airlines[0].iata, 
                        'name', airlines[0].en,
                        'icao', airlines[0].icao,
                        'iata', airlines[0].iata,
                        'language', airlines[0].fa
                    );
                    callback(null, {
                        'name': airlines[0].en,
                        'icao': airlines[0].icao,
                        'iata': airlines[0].iata,
                        'language': airlines[0].fa
                    });
                } else {
                    callback(null, {
                        'name': '',
                        'icao': '',
                        'iata': '',
                        'language': ''
                    });
                }
               
            }
        });
        
    },
    async getDataFromMysql(prmIata) {
        let row = {};
        try {
            row =  await modules.dbRo.query(`select * from gensec.viwAirlines where iata = ?`, [prmIata]);        
        } catch (e) {
            console.log(e);
        }

        return row;
    }
};

module.exports = self;