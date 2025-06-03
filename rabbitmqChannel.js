// const amqp = require('amqplib/callback_api');
// require("dotenv").config();
// amqp.connect(process.env.RABBITMQ, (err, conn) => {
//     if (err) console.log(err);
//     conn.createChannel((error, ch) => {
//         if (error) console.log(err);
//         // let q = 'hello';

//         // ch.assertQueue(q, { durable: false });
//         //this is where you can export the channel object
//         module.exports.channel = ch;  
//         //moved the sending-code to some 'external script'
//     });
// });