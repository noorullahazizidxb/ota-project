const amqp = require('amqplib/callback_api');
require("dotenv").config();

let self = {
    init(prmArgs, prmQueue, callback) {
        self.publisher(prmArgs, prmQueue, (msg) => {
            callback(msg);
        });
    }, 
    publisher(prmArgs, prmQueue) {
        amqp.connect(process.env.RABBITMQ, function(error0, connection) {
            if (error0) {
                throw error0;
            }
            connection.createChannel(function(error1, channel) {
                if (error1) {
                    throw error1;
                }
                channel.assertQueue(prmQueue, {
                    durable: false 
                });
                channel.sendToQueue(prmQueue, Buffer.from(JSON.stringify(prmArgs)));
                setTimeout(function() { 
                    connection.close(); 
                }, 500);
            });
        });
    }
};
module.exports = self;


/*let self = {
    init(prmArgs, prmQueue, callback) {
        self.publisher(prmArgs, prmQueue, (msg) => {
            callback(msg);
        });
    },
    publisher(prmArgs, prmQueue) {
        global.channelCreator.channel.assertQueue(prmQueue, {
            durable: false
        });
        global.channelCreator.channel.sendToQueue(prmQueue, Buffer.from(JSON.stringify(prmArgs)));
    }

};
module.exports = self;*/
