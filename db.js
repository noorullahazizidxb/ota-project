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
// In your code:
const mysql = require('mysql2/promise');  // Use the promise-based version

const config = {
    // connectionLimit : 800,
    host: process.env.DBHOST,
    user: process.env.DBUSERNAME,
    password: process.env.DBPASSWORD,
    database: process.env.DBNAME,
    port: process.env.DBPORT
};
const pool = mysql.createPool(config);

console.log(process.env.DBUSERNAME); 
console.log(process.env.DBPASSWORD); 

module.exports = pool;



async function testConnection() {
    try {
        const connection = await mysql.createConnection(config);
        console.log('Connected to MySQL successfully!');
        await connection.end();
    } catch (error) {
        console.error('Failed to connect to MySQL:', error.message);
    }
}

testConnection();