const BaseJoi = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);
module.exports = {
    body: {
        name: Joi.string()
    }
};