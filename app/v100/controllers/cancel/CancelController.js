const axios = require('axios');
let self = {
    async index(req, res) {
        let editContract = await self.editContract(req.body);
        res.json(editContract); 
    },
    async editContract(request) {
        let response = {};

        try {
            response = await axios.post(global.contract + '/contract/cancel', request, {
                headers: {
                    'Content-Type': 'application/json',
                    authorization:request.authorization//the token is a variable which holds the token
                }
            });
        } catch (e) {
            console.log(e);
            
        }

        return response.data;
    }
};
module.exports = self;
