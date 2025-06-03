const client = require('../../../../grpcClients/gensecGrpcClient');
let self  = {
    authorize(req, callback) {
        let varInput = { 
            method: req.method,
            path: req.path,
            roleId: req.body.payload.roleId
        };
        client.authorize(varInput, (clientError, data) => {
            if (clientError) {
                let custom = { Success:false,
                    Items:'permission denied' }; 
                callback(custom); 
            } else {
                const varIsLogin = JSON.parse(data.isPermitted);
                if (varIsLogin.rowCount === 0) {
                    let custom = { Success:false,
                        Items:'permission denied' }; 
                    callback(custom); 
                } else {
                    callback(null);
                }
            }
        });
    }
};
module.exports = self;
