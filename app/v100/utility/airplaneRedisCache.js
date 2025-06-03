const redis = require('../../../redis');
const modules = require('./modules');
// let request = {};
let self = {
    cache(prmAirplaneCode, callback) {
        let airplanes = [];
        
        redis.hexists(prmAirplaneCode, 'airplaneCode', async  (err, check) => {
            if (err) console.log(err);
            if (check > 0) {
                redis.hgetall(prmAirplaneCode, (error, result) => {
                    if (error) console.log(error);
                    callback(error, result);
                });
            } else {
                airplanes = await self.getDataFromMysql(prmAirplaneCode);
                if (airplanes.length > 0) {
                    await redis.hmset(
                        airplanes[0].airplaneCode, 
                        'id', airplanes[0].id,
                        'airplaneCode', airplanes[0].airplaneCode,
                        'airplaneName', airplanes[0].en
                    );
                    callback(null, {
                        'id': airplanes[0].id,
                        'airplaneCode': airplanes[0].airplaneCode,
                        'airplaneName': airplanes[0].en
                    });
                } else {
                    callback(null, {
                        'id': '',
                        'airplaneCode': '',
                        'airplaneName': ''
                    });
                }
                
            }
        });
        
    },
    async getDataFromMysql(prmAirplaneCode) {
        let row = {};
        try {
            row =  await modules.dbRo.query(`select * from gensec.viwAirplanes where airplaneCode = ?`, [prmAirplaneCode]);
        } catch (e) {
            console.log(e);
        }

        return row;
    }
};

module.exports = self;