const axios = require('axios');

let self = {

    async getCurrencyData(orgId, payloadOrgId, authorization) {
        
        let currencyConvertJson = [];
        if (orgId === payloadOrgId) {
            try {
                // let token =  await axios.get(global.gensec + '/guesttoken?OrgId=' + orgId);
                currencyConvertJson = await axios.get(global.gensec + '/currencyconvert', {
                    headers: {
                        authorization
                    }
                });
            } catch (e) {
                console.log(e);
            }
        } else {
            try {
                let token =  await axios.get(global.gensec + '/guesttoken?OrgId=' + orgId);
                currencyConvertJson = await axios.get(global.gensec + '/currencyconvert', {
                    headers: {
                        authorization: 'Bearer ' + token.data.token 
                    }
                });
            } catch (e) {
                console.log(e);
            }
        }

        return currencyConvertJson.data.Items;
    },

    async getDefaultCurrency(orgId, payloadOrgId, defaultCurrency) {

        
        let currencyDefaultOrganization = '';
        let parseTokenObject = {};
        if (orgId === payloadOrgId) {
            currencyDefaultOrganization = defaultCurrency;
            
        } else {
            try {
                let token =  await axios.get(global.gensec + '/guesttoken?OrgId=' + orgId);
                parseTokenObject = await axios.get(global.gensec + '/parsetoken', {
                    headers: {
                        authorization: 'Bearer ' + token.data.token 
                    }
                });
            } catch (e) {
                console.log(e);
            }
            currencyDefaultOrganization = parseTokenObject.data.Items.data;
        }

        return currencyDefaultOrganization;
    }

};
module.exports = self;