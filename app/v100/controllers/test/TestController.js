

module.exports = {
    index(req, res) {
        // console.log(global.name);
        // throw new Error();

        // let header = {
        //     authorization: 'Bearer eyJhbGciOJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsIm5hbWUiOiLZhdit2LPZhiIsImZhbWlseSI6Itiq2qnZhduM2YTbjCIsImVtYWlsIjoidGFrbWlsaUBjaXR5bmV0LmlyIiwicm9sZUlkIjoxLCJtb2JpbGUiOiI5MTI1NzAwNjM3Iiwic2dyb3VwSWQiOjEsIm9yZ0lkIjoxLCJmcm9tT3JnSWQiOjEsImRlZmF1bHRDdXJyZW5jeUlkIjoxLCJkZWZhdWx0Q3VycmVuY3lBYmIiOiJJUlIiLCJvcmdEYXRhIjoie1wic21zXCI6IHtcInBhc3N3b3JkXCI6IFwiQ2l0eW5ldCM4ODQ3XCIsIFwidXNlcm5hbWVcIjogXCJjaXR5bmV0XCJ9LCBcImVtYWlsXCI6IHtcImNjXCI6IFwiXCIsIFwiZnJvbVwiOiBcIm1haWxAYmVoZ2FyZC5jb21cIiwgXCJob3N0XCI6IFwibWFpbC5iZWhnYXJkLmNvbVwiLCBcInBhc3N3b3JkXCI6IFwic0VAezllWXRqQVVZXCIsIFwidXNlcm5hbWVcIjogXCJtYWlsQGJlaGdhcmQuY29tXCJ9LCBcIm1lbGxhdFwiOiB7XCJwYXNzd29yZFwiOiBcIjc1NjY1ODMyXCIsIFwidGVybWluYWxcIjogXCIyNzg0MDg3XCIsIFwidXNlcm5hbWVcIjogXCJjMzIwXCJ9LCBcIm1vYmlsZVwiOiB7XCJ2ZXJzaW9uX2NvZGVcIjogXCIxXCIsIFwidmVyc2lvbl9uYW1lXCI6IFwiMS4xXCJ9LCBcIm9yaWdpblwiOiBcImh0dHBzOi8vYmVoZ2FyZC5jb21cIiwgXCJwYXNhcmdhZFwiOiB7XCJtZXJjaGFudFwiOiBcIjI0ODkxMTdcIiwgXCJ0ZXJtaW5hbFwiOiBcIjg3MzAxM1wiLCBcInByaXZhdGVfa2V5XCI6IFwiY2l0eW5ldC54bWxcIn0sIFwibG9naW5fdHlwZVwiOiBudWxsLCBcImFnZW5jeV9uYW1lXCI6IFwi2KjZh9qv2LHYr1wiLCBcImZhY3Rvcl9jb2RlXCI6IFwiMjUyNlwifSIsImlhdCI6MTU1MzcyNDk1NiwiZXhwIjoxNTUzODExMzU2fQ.phhjHZGTH10vWQnNubfXzlRaXE12yV26BGFZGZTJYJM'
        // };
        // try {
        //     modules.axios.get('http://localhost:8586/api/v1.0/info', {
        //         headers: header
        //     });
        // } catch (error) {
        //     console.log(error);
        //     throw new ResourceNotFoundError(error);
        // }


        res.json({
            success: true,
            items: req.body
        });
    }

};