/* eslint-disable require-await */
const amqp = require('amqplib');
const uuid = require('uuid');

let instance;
class MessageBroker {

    async init() {
        this.connection = await amqp.connect(process.env.RABBITMQ || 'amqp://localhost');
        this.channel = await this.connection.createChannel();

        return this;
    }

    async send(prmArgs, prmQueue, callback) {
        if (!this.connection) {
            await this.init();
        }
        let q = await this.channel.assertQueue('', { durable: true });
        let correlationId = uuid.v1();
        // this.channel.sendToQueue(queue, msg);
        this.channel.consume(q.queue, function(msg) {
            if (msg.properties.correlationId === correlationId) {
              
              // console.log(' [.] Got %s', msg.content.toString());
                callback(JSON.parse(msg.content));
                // setTimeout(function() { 
                //     connection.close(); 
                // }, 5000);
            }
        }, {
            noAck: true
        
        });
        this.channel.sendToQueue(prmQueue, Buffer.from(JSON.stringify(prmArgs)), { 
            correlationId, 
            replyTo: q.queue
         
        });
    }

  }
    
MessageBroker.getInstance = async function() {
    if (!instance) {
        const broker = new MessageBroker();
        instance = broker.init();
    }
    
    return instance;
};

module.exports = MessageBroker;
