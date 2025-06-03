/* eslint-disable no-negated-condition */
const express = require('express'); // call express
const app = express(); // define our app using express
const router = require('./routes/routes');
require("dotenv").config();
const helmet = require('helmet');
const compression = require('compression');
const useragent = require('express-useragent');
const requestIp = require('request-ip');
const serviceRegister = require('./app/v100/utility/CatchServiceRegistery');
const channelCreator = require('./rabbitmqChannel');
const getTicket = require('./app/v100/controllers/getTicketNumber/getTicketNumber');


if (process.env.MICROSERVICENAME === '5kflight') {

    setInterval(() => {
        getTicket.init();
    }, 100000);
}
global.channelCreator = channelCreator;

serviceRegister.setAddress();
app.use(useragent.express());
app.use(requestIp.mw());
app.use(compression());
app.use(express.urlencoded({
    extended: true
})); 

app.use(express.json());

app.use(helmet());


app.use('/api', router);

app.use((req, res, next) => {
    const error = new Error("Not found");
    error.status = 404;
    next(error);
});
      
      // error handler middleware
app.use((error, req, res) => {
    res.status(error.status || 500).send({
        Success: false,
        Items: {
            status: error.status || 500,
            message: error.message || 'Internal Server Error'
        }
    });
});
// require('./app/v100/middlewares/grpcClient/Authenticate');
// eslint-disable-next-line no-process-env
let port = process.env.PORT;
let server = app.listen(port);
console.log('Console :', port);
server.timeout = 180000;
