/* eslint-disable max-depth */
/* eslint-disable no-await-in-loop */
/* eslint-disable max-statements */
const modules = require('../../utility/modules');
const uuid = require('../../utility/uuid');
const subsystemRabbit = require('../../amqp/client/rabbitmqClientSimple');
const axios = require('axios');
module.exports = {
    async init() {
        let row = await modules.db.query(`SELECT bookRequest->> "$.AirItinerary" AS AirItinerary,bookRequest->>"$.TravelerInfo.AirTraveler" AS AirTraveler,
        subsystemTicketResponse->>"$.data" as subsystemTicketResponse,searchRequest->>"$.WebserviceAuthentication" AS WebserviceAuthentication, 
        isTicketed FROM results where status='ticketed' 
        AND error = 'true'
        AND isTicketed =0 
        and updatedAt < NOW() - INTERVAL 1 MINUTE order by createdAt DESC`);
        if (row.length > 0) {
            for (let i = 0; i < row.length; i++) {
                let serviceInfo = JSON.parse(row[i].WebserviceAuthentication).loginInfo;
                let inputOrder =  JSON.parse(row[i].subsystemTicketResponse);

               console.log(JSON.stringify(inputOrder));
               
                // try {
                //     orderDetailResponse = await axios.post(serviceInfo.url + `/json/orderDetail/v9`, inputOrder, { headers: { 
                //         'User-Agent': 'Apifox/1.0.0 (https://apifox.com)', 
                //         'Content-Type': 'application/json'
                //     } });
                // } catch (orderDetailError) {
                //     console.log('orderDetailError:', orderDetailError);
                // }    
                let ticResponse = {};
                try {
                    ticResponse = await axios.post(serviceInfo.url + `/api/XmlConnect/Retrive`, {
                        referenceNumber:inputOrder.Data.ReferenceNumber,
                        Target:serviceInfo.Target
                    }, { headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': 'Bearer ' + serviceInfo.token
                    } });
                        
                } catch (ticket1ResponseError) {
                    console.log('ticketResponseError:', ticket1ResponseError);
                }
                console.log({
                    referenceNumber:inputOrder.Data.referenceNumber,
                    Target:serviceInfo.Target
                });
                
                console.log(JSON.stringify(ticResponse.data));
                if (ticResponse && ticResponse.data && (ticResponse.data.Success === 'true' || ticResponse.data.Success === true) && ticResponse.data.Data.TravelItinerary.TicketStatus === "Ticketed") {
                    try {
                        await modules.db.query(`UPDATE results SET  subsystemBookDataResponse   = ? WHERE sessionId = ? AND combinationId = ?`, [
                            JSON.stringify(ticResponse.data),
                            uuid.getBinaryUUID(JSON.parse(row[i].AirItinerary).SessionId),
                            JSON.parse(row[i].AirItinerary).CombinationId
                        ]);
                            
                    } catch (error) {
                        console.log("🚀 ~ errorUpdateBookData ~ error:", error);
                            
                    }
                    
                    let passengers = JSON.parse(row[i].AirTraveler);
                    // if (orderDetailResponse.data.data.orderStatus === "ISSED") {
                    for (let k = 0; k < passengers.length; k++) {
                        passengers[k].ReferenceId = ticResponse.data.Data.TravelItinerary.referenceNumber;
                        for (let j = 0; j < ticResponse.data.Data.TravelItinerary.PassengerInfos.length; j++) {
                            if (passengers[k].PersonName.GivenName.toUpperCase() === ticResponse.data.Data.TravelItinerary.PassengerInfos[j].PaxName.PassengerFirstName.toUpperCase() && passengers[k].PersonName.Surname.toUpperCase() === ticResponse.data.Data.TravelItinerary.PassengerInfos[j].PaxName.PassengerLastName.toUpperCase() && passengers[k].Document.DocID.toUpperCase() === ticResponse.data.Data.TravelItinerary.PassengerInfos[j].PassportNumber.toUpperCase()) {
                                passengers[k].TicketNumber = [ticResponse.data.Data.TravelItinerary.PassengerInfos[j].ETicketNumber];
                            }
                        }
                    }
                    let prmObj = {
                        TravelerInfo :{
                            AirTraveler:passengers
                        },
                        AirItinerary :JSON.parse(row[i].AirItinerary)
                    };
                    console.log(196, prmObj);
                    subsystemRabbit.publisher(prmObj, 'simple_passengerInfo');
                    modules.db.query(`UPDATE results SET isTicketed =1 where sessionId=? AND combinationId=?`, [
                        uuid.getBinaryUUID(JSON.parse(row[i].AirItinerary).SessionId),
                        JSON.parse(row[i].AirItinerary).CombinationId
                    ]);
                }
                    
                // }
            }
        }
    }
};
