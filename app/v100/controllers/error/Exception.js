/**
 * Created by kaveh on 2018-09-04.
 */
let self = {
    responseException(myResponse, res) {
        res.status(400).json({
            success : false,
            items : [
                {
                    ErrorCode : 1,
                    OriginalErrorCode : myResponse[0].attributes.Code,
                    Text :  myResponse[0].attributes.ShortText
                }
            ]
        });
    }
};
module.exports = self;