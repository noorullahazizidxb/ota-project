const uuid = require('uuid');
// const channelCreator = require('../../../../rabbitmqChannel');
require("dotenv").config();
const  amqp = require('amqplib/callback_api');
let self = {
    init(prmArgs, prmQueue, callback) {
        self.publisher(prmArgs, prmQueue, (msg) => {
            callback(msg);
        }); 
    },
    publisher(prmArgs, prmQueue, callback) {
        amqp.connect(process.env.RABBITMQ, function(error0, connection) {
            if (error0) {
                throw error0;
            }
            connection.createChannel(function(error1, channel) {
                if (error1) {
                    throw error1;
                }
                channel.assertQueue('', {
                    exclusive: true,
                    durable: false
                    // arguments: {
                    //     "x-message-ttl": 10000
                    // }
                }, function(error2, q) {
                    if (error2) {
                        throw error2;
                    }
                    let correlationId = uuid.v1();
                    channel.consume(q.queue, function(msg) {
                        if (msg.properties.correlationId === correlationId) {
                            
                            // console.log(' [.] Got %s', msg.content.toString());
                            callback(JSON.parse(msg.content));
                            setTimeout(function() { 
                                connection.close(); 
                            }, 5000);
                        }
                    }, {
                        noAck: true
                      
                    });
                    channel.sendToQueue(prmQueue, Buffer.from(JSON.stringify(prmArgs)), { 
                        correlationId, 
                        replyTo: q.queue
                       
                    });
                });
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
    publisher(prmArgs, prmQueue, callback) {
        global.channelCreator.channel.assertQueue('', {
            exclusive: true
        }, (error2, q) => {
            if (error2) console.log(error2);
            let correlationId = uuid();
            global.channelCreator.channel.consume(q.queue, (msg) => {
                if (msg.properties.correlationId === correlationId) {
                    callback(JSON.parse(msg.content));
                }
            }, {
                noAck: true 
            });
            global.channelCreator.channel.sendToQueue(prmQueue, Buffer.from(JSON.stringify(prmArgs)), {
                correlationId,
                replyTo: q.queue
            });
        });
    }

};
module.exports = self;*/
