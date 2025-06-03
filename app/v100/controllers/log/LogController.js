let request = {};
const modules = require('../../utility/modules');

let self = {
    async index(req, res) {
        request = req.body;
        let log = await self.getLog(request);
        if (typeof log[0] === 'undefined') {
            res.json({
                Success: true,
                Items: {}
            });
        } else {
            res.json({
                Success: true,
                Items: {
                    SearchRequest: JSON.parse(log[0].searchRequest),
                    BookRequest: JSON.parse(log[0].bookRequest),
                    BookResponse: JSON.parse(log[0].bookResponse),
                    TicketRequest: JSON.parse(log[0].ticketRequest),
                    TicketResponse: JSON.parse(log[0].ticketResponse)
                }
            });
        }
        
    },
    async getLog (prmRequest) {
        let row = [];
        try {
            row = await modules.db.query(` call prcLogRow(?, ?, ?, ?, ?)`, [
                prmRequest.payload.orgId,
                prmRequest.payload.accountId,
                prmRequest.payload.roleType,
                request.AirItinerary.SessionId,
                request.AirItinerary.CombinationId
            ]);
            
            // console.log(row);
        } catch (e) {
            console.log(e);
        }

        return row[0];
    }
};
module.exports = self;
