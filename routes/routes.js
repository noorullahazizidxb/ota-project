/* eslint-disable no-process-env */
/* eslint-disable callback-return */
const express = require('express');
const {
    ValidationError
} = require('../app/v100/utility/ApplicationError');

const TestController = require('../app/v100/controllers/test/TestController');
const SearchController = require('../app/v100/controllers/search/SearchController');

const validate = require('express-validation');
const testRequest = require('./../app/v100/requests/testRequest');
const BookController = require('../app/v100/controllers/book/BookController');
const TicketController = require('../app/v100/controllers/ticket/TicketController');
const LogController = require('../app/v100/controllers/log/LogController');


const midSetRequest = require('./../app/v100/middlewares/SetRequest');
// const midAuth = require('./../app/v100/middlewares/Authenticate');
const midAuthGrpc = require('./../app/v100/middlewares/grpcClient/Authenticate');
const midAuthorizeGrpc = require('./../app/v100/middlewares/grpcClient/Authorizer');
const baggageController = require('../app/v100/controllers/baggage/baggageController');
const RuleController = require('../app/v100/controllers/rule/RuleController');
// const CancelController = require('../app/v100/controllers/cancel/CancelController');
const MetaSearchController = require('../app/v100/controllers/metaSearch/SearchController');
const cancelController = require('../app/v100/controllers/cancel/CancelController');
const balanceController = require('../app/v100/controllers/balance/balanceAmountController');
/* eslint-disable-next-line new-cap */
const router = express.Router();


// router.use((req, res, next) => {
//     midSetRequest.setRequest(req);
//     // midSetRequest.headerConfig(res);
//     next();
// });
//do not need login before this middleware
// router.use((req, res, next) => {
//     midAuth.auth(req, (err, payload) => {
//         if (err) {
//             res.status(err.Status).json(err);
//         } else {
//             req.body.payload = payload;
//             req.body.microserviceName = process.env.MICROSERVICENAME;
//             next();
//         }
//     });
// });
// router.use((req, res, next) => {
//     midAuthGrpc.auth(req, (err, payload) => {
//         if (err) {
//             res.status(401).json(err);
//         } else {
//             req.body.payload = payload;
//             req.body.microserviceName = process.env.MICROSERVICENAME;
//             next();
//         }
//     });
// });
//those need login after this middleware

// router.use((req, res, next) => {
//     midAuthorizeGrpc.authorize(req, (err) => {
//         if (err) {
//             res.status(403).json(err);
//         } else {
//             next();
//         }
//     });
        
// });

/*-------v1.0--------------*/
router.use('/healthcheck', require('express-healthcheck')());
router.route('/v1.0/test').get(validate(testRequest), TestController.index);
router.route('/v1.0/flights/search').post(SearchController.index);
router.route('/v1.0/flights/book').post(BookController.index);
router.route('/v1.0/flights/ticket').post(validate(testRequest), TicketController.index);
router.route('/v1.0/flights/rules').post(RuleController.index);
router.route('/v1.0/flights/baggage').post(baggageController.index);
router.route('/v1.0/flights/cancel').post(cancelController.index);
router.route('/v1.0/flights/metasearch').post(MetaSearchController.index);
router.route('/v1.0/flights/log').post(LogController.index);
router.route('/v1.0/subsystem/balance').post(balanceController.index);

/*-------v2.0--------------*/
router.route('/v2.0/test').get(validate(testRequest), TestController.index);
// router.route('/apis').get(BookingDataController.index);
/*-------partocrs--------------*/
// router.route('/user').post(UserController.postUser);

router.use((err, req, res, next) => {
    if (err.message === 'validation error') {
        let custom = new ValidationError(err);
        res.status(custom.Status).json(custom);
    } else {
        next(err);
    }
});
module.exports = router;