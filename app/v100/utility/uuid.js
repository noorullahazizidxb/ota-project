/* eslint-disable require-unicode-regexp */
const uuid = require('uuid');
let self = {
    createUUID(_id) {
        const id = _id || uuid.v4();
        const buf = self.getBinaryUUID(id);
      
        return {
            uuid: id,
            buffer: buf
        };
    },
    getBinaryUUID(id) {
        return Buffer.from(id.replace(/-/g, ''), 'hex');
    },
    getStringUUID(buf) {
        return [
            buf.toString('hex', 4, 8),
            buf.toString('hex', 2, 4),
            buf.toString('hex', 0, 2),
            buf.toString('hex', 8, 10),
            buf.toString('hex', 10, 16)
        ].join('-');
    }

};
module.exports = self;