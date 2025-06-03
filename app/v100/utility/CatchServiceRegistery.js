const db = require('../../../db');

module.exports = {
    async setAddress() {

        try {
            let row = await db.query(`select name , address from serviceRegistries`);
            row.forEach((item) => {
                let variableName = item.name;
                global[variableName] = item.address;
            });
        } catch (e) {
            console.log(e);
        }
    }
};