const client = require('../../../../grpcClients/gensecGrpcClient');
const jwt = require('jsonwebtoken');
let self  = {
    auth(req, callback) {
        let token = req.body.authorization ? req.body.authorization.split(' ')[1] : req.body.token;
        if (token) {
            jwt.verify(token, process.env.SECRET, (err, authData) => {
                if (err) {
                    callback({ Success: false,
                        Items: 'Failed to authenticate token.' });
                } else {
                    authData.token = token;
                    client.authenticate(authData, (clientError, data) => {
                        const varIsLogin = JSON.parse(data.userSession);
                        if (varIsLogin.success === false) {
                            callback({ Success: false,
                                Items: 'No token provided.' });
                        } else {
                            callback(null, varIsLogin);
                        }
                    });
                }
            });
        } else {
            callback({ Success: false,
                Items: 'No token provided.' });
        }
    }
};
module.exports = self;
