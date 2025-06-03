const jwt = require('jsonwebtoken');
// const axios = require('axios');
const rabbit = require('./../amqp/rabbit');  
const {
    LoginError
} = require('../utility/ApplicationError');
let self  = {
    auth(req, callback) {
        let token = req.body.authorization ? req.body.authorization.split(' ')[1] : req.body.token;
        if (token) {
            jwt.verify(token, process.env.SECRET, (err, authData) => {
                if (err) {
                    let custom = new LoginError('Failed to authenticate token.');
                    callback(custom, null);
                } else {
                    authData.token = token;
                    self.parsToken(authData, (info) => {
                        if (info.failed) {
                            let custom = new LoginError('No token provided.');
                            callback(custom, null);
                        } else {
                            callback(null, info);
                        }
                    });
                }
            });

        } else {
            let custom = new LoginError('No token provided.');
            callback(custom, null);
        }
    },
    async parsToken(prmAuthData, callback) {
        const broker = await rabbit.getInstance();
        broker.send(prmAuthData, 'rpc_token', (msg) => {
            callback(msg);
        });
        // axios.get(global.gensec + `/parsetoken`, {
        //     headers : {
        //         Authorization: `Bearer ` + prmToken
        //     }
        // }).then(function (response) {
        //     // handle success
        //     callback(response.data.Items);
        // }).
        //   catch(function (error) {
        //       console.log(error);
        //   });

    }
};
module.exports = self;