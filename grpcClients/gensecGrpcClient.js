require('dotenv').config();
const PROTO_PATH = "./protoFiles/gensecgrpc.proto";
// const PROTO_PATH = "./users.proto";
// const serviceRegister = require('./app/v100/utility/CatchServiceRegistery');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    arrays: true
});
// serviceRegister.setAddress();
const GensecService = grpc.loadPackageDefinition(packageDefinition).GensecService;
const client = new GensecService(
  process.env.GENSECGRPC,
  grpc.credentials.createInsecure()
);
// console.log(process.env.GENSECGRPC, grpc.credentials.createInsecure(), client);

module.exports = client;
