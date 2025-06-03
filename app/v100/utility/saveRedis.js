const redis = require('../../../redis8');
const modules = require('./modules');
// let request = {};
let self = {
    
    async storeAsync(data) {
        await redis.hset(
            data.sessionId + '$$' + data.combinationId.toString() + '$$0$$' + data.subsystemId.toString(), 
            "sessionId", data.sessionId,
            "combinationId", data.combinationId,
            "searchRequest", data.searchRequest,
            "subsystemSearchResponse", data.subsystemSearchResponse,
            "searchResponse", data.searchResponse
        );
        await redis.expire(data.sessionId + '$$' + data.combinationId.toString() + '$$0$$' + data.subsystemId.toString(), 1200);
        // callback(true);
    },
    async getDataFromMysql(prmIata) {
        let row =  await modules.dbRo.query(`select * from gensec.viwAirlines where iata = ?`, [prmIata]);

        return row;
    },
    store(data, callback) {
        redis.hset(
            data.sessionId + '$$' + data.combinationId.toString() + '$$0$$' + data.subsystemId.toString(), 
            "sessionId", data.sessionId,
            "combinationId", data.combinationId,
            "searchRequest", data.searchRequest,
            "subsystemSearchResponse", data.subsystemSearchResponse,
            "searchResponse", data.searchResponse
        );
        redis.expire(data.sessionId + '$$' + data.combinationId.toString() + '$$0$$' + data.subsystemId.toString(), 1200);
        callback(true);
    },
    getData(data, callback) {
        redis.hexists(data.SessionId + '$$' + data.CombinationId.toString() + '$$0$$' + data.SubsystemId.toString(), 'sessionId', (err, check) => {
            if (err) console.log(err);
            if (check > 0) {
                redis.hgetall(data.SessionId + '$$' + data.CombinationId.toString() + '$$0$$' + data.SubsystemId.toString(), (error, result) => {
                    if (error) console.log(error);
                    callback(error, result);
                });
            } else {
                callback(null, -1);
            }
        });
        // redis.hset(
        //     data.sessionId + '$$' + data.combinationId.toString() + '$$0$$' + data.subsystemId.toString(), 
        //    "sessionId", data.sessionId,
        //    'combinationId', data.combinationId,
        //    'searchRequest', data.searchRequest,
        //    'subsystemSearchResponse', data.subsystemSearchResponse, 'searchResponse', data.searchResponse
        // );
        // redis.expire(data.sessionId + '$$' + data.combinationId.toString() + '$$0$$' + data.subsystemId.toString(), 1200);
        // callback(true);
    },
    async getDataAsync(data) {
        // console.log(data);
        try {
            let check = await redis.hexists(data.SessionId + '$$' + data.CombinationId.toString() + '$$0$$' + data.SubsystemId.toString(), 'sessionId');
            if (check > 0) {
                let result = await redis.hgetall(data.SessionId + '$$' + data.CombinationId.toString() + '$$0$$' + data.SubsystemId.toString());
                
                return result;
            } 
            
            return -1;
        } catch (error) {
            console.log(error);

            return -1;
        }
        
        // redis.hset(
        //     data.sessionId + '$$' + data.combinationId.toString() + '$$0$$' + data.subsystemId.toString(), 
        //    "sessionId", data.sessionId,
        //    'combinationId', data.combinationId,
        //    'searchRequest', data.searchRequest,
        //    'subsystemSearchResponse', data.subsystemSearchResponse, 'searchResponse', data.searchResponse
        // );
        // redis.expire(data.sessionId + '$$' + data.combinationId.toString() + '$$0$$' + data.subsystemId.toString(), 1200);
        // callback(true);
    }
};

module.exports = self;