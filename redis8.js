// /**
//  * Created by kaveh on 11/9/16.
//  */
require("dotenv").config();
const Redis = require('ioredis');
let config = {
    port: process.env.REDISSERVERPORTSAVECACHE, // Redis port
    host: process.env.REDISSERVERHOSTSAVECACHE, // Redis host
    family: 4, // 4(IPv4) or 6(IPv6)
    password: process.env.REDISSERVERPASSWORDSAVECACHE,
    db: 8
};
const redis = new Redis(config);
module.exports = redis;

// const redis = require('ioredis');
// require('dotenv').config();
// class Redis {
//     constructor() {
//         this.host = process.env.REDISSERVERPORT;
//         this.port = process.env.REDISSERVERPORT;
//         this.db = 8;
//         this.password = process.env.REDISSERVERPASSWORD;
//         this.family = 4;
//         this.connected = false;
//         this.client = null;
//     }

//     getConnection() {
//         if (this.connected) return this.client;
    
//         this.client = redis.createClient({
//             host: this.host,
//             port: this.port
//         });
//         this.connected = true;
        
//         return this.client;
    
//     }
// }
// module.exports = new Redis();
