/* eslint-disable no-process-env */
/*var mysql = require('mysql');
var pool = mysql.createPool({
    host     : 'localhost',
    user     : 'root',
    password : 'sys',
    database : 'techmaster',
    connectionLimit : 50
})*/
/*pool.getConnection(function(err) {
    if (err) throw err;
});

module.exports = pool;*/

require("dotenv").config();

//const mysql = require("promise-mysql");


const mysql = require('mysql2/promise');  // Use the promise-based version



const config = {
    // connectionLimit : 800,
    host: process.env.DBHOSTRO,
    user: process.env.DBUSERNAMERO,
    password: process.env.DBPASSWORDRO,
    database: process.env.DBNAMERO,
    port: process.env.DBPORTRO,
    multipleStatements: true
};
const pool = mysql.createPool(config);
module.exports = pool;