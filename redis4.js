/**
 * Created by kaveh on 11/9/16.
 */
require("dotenv").config();
const Redis = require('ioredis');
let config = {
    port: process.env.REDISPORT, // Redis port
    host: process.env.REDISHOST, // Redis host
    family: 4, // 4(IPv4) or 6(IPv6)
    password: process.env.REDISPASSWORD,
    db: process.env.REDISDBMULTIAIRPORTCITY
};
const redis = new Redis(config);
module.exports = redis;
