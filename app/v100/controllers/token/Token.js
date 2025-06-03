/* eslint-disable max-statements */
const axios = require('axios');
const qs = require('qs');
// const {
//     RequestError
// } = require('../../utility/ApplicationError');
const redis = require('../../../../redisToken');
let self = {
    async getToken(serviceInfo) {
        let check = await redis.hexists('avijeh' + serviceInfo.client_id + '$$' + serviceInfo.client_secret + '$$' + serviceInfo.agencyId, 'token');
        if (check > 0) {
            let result = await redis.hgetall('avijeh' + serviceInfo.client_id + '$$' + serviceInfo.client_secret + '$$' + serviceInfo.agencyId);
                
            return result.token;
        } 
        // let check1 = await redis.hexists('delete' + serviceInfo.client_id + '$$' + serviceInfo.client_secret + '$$' + serviceInfo.Password, 'session');
        // if (check1 > 0) {
        //     // let result = await redis.hgetall('delete' + serviceInfo.OfficeId + '$$' + serviceInfo.UserName + '$$' + serviceInfo.Password);
                
        //     return '';
        // } 
       
        let result = -1;
        let data = qs.stringify({
            client_id: serviceInfo.client_id,
            client_secret: serviceInfo.client_secret,
            userName: serviceInfo.userName,
            password: serviceInfo.password,
            agencyId: serviceInfo.agencyId,
            grant_type: serviceInfo.grant_type
        });
        let config = {
            method: 'post',
            url: serviceInfo.Url + '/token',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data
        };
        try {
            let tokenResponse = await axios(config);
            // tokenResponse.data.access_token;
                            //'Content-Type': 'application/json'
            if (tokenResponse.data.access_token) {
                result = tokenResponse.data.access_token;
                redis.hset('avijeh' + serviceInfo.client_id + '$$' + serviceInfo.client_secret + '$$' + serviceInfo.agencyId, "token", tokenResponse.data.access_token);
                redis.expire('avijeh' + serviceInfo.client_id + '$$' + serviceInfo.client_secret + '$$' + serviceInfo.agencyId, 432000);
            }
                    //console.log(JSON.stringify(response.data));

            return result;
        } catch (error) {

            console.log(JSON.stringify(error.response.data));
        
            return result;
                    //console.log(error);
        }


    },
    getTokenCallback(serviceInfo, callback) {
        
        redis.hexists('avijeh' + serviceInfo.client_id + '$$' + serviceInfo.client_secret + '$$' + serviceInfo.agencyId, 'token', (err, check) => {
            if (err) {
                console.log(err);
                callback(err, '');
            } else if (check > 0) {
                redis.hgetall('avijeh' + serviceInfo.client_id + '$$' + serviceInfo.client_secret + '$$' + serviceInfo.agencyId, (error, result) => {
                    if (error) console.log(error);
                    callback(error, result.token);
                }); 
            } else {
               
                let data = qs.stringify({
                    client_id: serviceInfo.client_id,
                    client_secret: serviceInfo.client_secret,
                    userName: serviceInfo.userName,
                    password: serviceInfo.password,
                    agencyId: serviceInfo.agencyId,
                    grant_type: serviceInfo.grant_type
                });
                let config = {
                    method: 'post',
                    url: serviceInfo.Url + '/token',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    data
                };
                axios(config).
                then(function (tokenResponse) {
                    if (tokenResponse.data.access_token) {
                        let result = tokenResponse.data.access_token;
                        redis.hset('avijeh' + serviceInfo.client_id + '$$' + serviceInfo.client_secret + '$$' + serviceInfo.agencyId, "token", tokenResponse.data.access_token);
                        redis.expire('avijeh' + serviceInfo.client_id + '$$' + serviceInfo.client_secret + '$$' + serviceInfo.agencyId, 432000);
                        callback(null, result);
                    } else {
                        callback(true, null);
                    }
                }).catch(function (e) {
                    console.log(e);
                    
                    callback(true, null);
                });
            }
        });
    

    }

};
module.exports = self;