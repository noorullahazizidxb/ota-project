const {
      AuthorizeError
  } = require('../utility/ApplicationError');  
// const authorize = require('../amqp/client/rabbitmqClient');
const rabbit = require('./../amqp/rabbit');  
let self = {
    authorize(req, callback) {
        let varInput = { 
            method: req.method,
            path: req.path,
            roleId: req.body.payload.roleId
        };
          
        self.checkPermittedFromDatabase(varInput, (msg) => {
            if (msg.rowCount === 0) {
                let custom = new AuthorizeError('permission denied'); 
                callback(custom); 
            } else {
                callback(null);
            }
        });
          
    },
    async checkPermittedFromDatabase(prmAuthData, callback) {
        const broker = await rabbit.getInstance();
        broker.send(prmAuthData, 'rpc_authorize', (msg) => {
            callback(msg);
        });
        // authorize.init(prmAuthData, 'rpc_authorize', (msg) => {
        //     callback(msg);
        // });
    }
};
module.exports = self;