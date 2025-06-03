/* eslint-disable max-depth */
/* eslint-disable max-statements */
/* eslint-disable no-await-in-loop */
const redis4 = require("../../../redis4");
const airports = require("./airportListRedisCache");
module.exports = {
    async init(input) {
       
        let allArray = [];
        for (let i = 0; i < input.length; i++) {
            let originInfo = [];
            let originArray = [];
            let DestinationArray = [];
            if (input[i].OriginLocation.MultiAirportCityInd === true) {
                if (input[i].OriginLocation.LocationCode === 'THR') {
                    if (input[i].DestinationLocation.MultiAirportCityInd === true) {
                        originArray.push('IKA');
                    } else {
                        let airportObject = await airports.cacheSynchronize(input[i].DestinationLocation.LocationCode);
                        if (airportObject.countryCode === 'IR') {
                            originArray.push('THR');
                        } else {
                            originArray.push('IKA');
                        }
                    }
                } else {
                    let isExist = await redis4.exists(process.env.MICROSERVICENAME + input[i].OriginLocation.LocationCode);
                    if (isExist === 1) {
                        let cities = await redis4.get(process.env.MICROSERVICENAME + input[i].OriginLocation.LocationCode);
                        // console.log(1, cities);
                        JSON.parse(cities).map((city) => originArray.push(city));
                    } else {
                        originArray.push(input[i].OriginLocation.LocationCode);
                    } 
                }
            } else {
                originArray.push(input[i].OriginLocation.LocationCode);
            }
            
            if (input[i].DestinationLocation.MultiAirportCityInd === true) {
                if (input[i].DestinationLocation.LocationCode === 'THR') {
                    if (input[i].OriginLocation.MultiAirportCityInd === true) {
                        DestinationArray.push('IKA');
                    } else {
                        let airportObject = await airports.cacheSynchronize(input[i].OriginLocation.LocationCode);
                        if (airportObject.countryCode === 'IR') {
                            DestinationArray.push('THR');
                        } else {
                            DestinationArray.push('IKA');
                        }
                    }
                } else {
                    let isExist = await redis4.exists(process.env.MICROSERVICENAME + input[i].DestinationLocation.LocationCode);
                    if (isExist === 1) {
                        let cities = await redis4.get(process.env.MICROSERVICENAME + input[i].DestinationLocation.LocationCode);
                        JSON.parse(cities).map((city) => DestinationArray.push(city));
                    } else {
                        DestinationArray.push(input[i].DestinationLocation.LocationCode);
                    } 
                }
               
            } else {
                DestinationArray.push(input[i].DestinationLocation.LocationCode);
            }
            for (let z = 0; z < originArray.length; z++) {
                for (let k = 0; k < DestinationArray.length; k++) {
                    originInfo.push({
                        level : i,
                        origin : originArray[z],
                        destination: DestinationArray[k]
                    });
                }
            }
           
            allArray.push(originInfo);
        }
        let cartesianArray = allArray.reduce((a, b) => a.map((x) => b.map((y) => x.concat([y]))).reduce((c, d) => c.concat(d), []), [[]]);
        // console.log(cartesianArray);
        let output = [];
        for (let j = 0; j < cartesianArray.length; j++) {
            let originDestinationInfo = JSON.parse(JSON.stringify(input));
            // originDestinationInfo.mao(o => o.)
            for (let x = 0; x < originDestinationInfo.length; x++) {
                originDestinationInfo[x].OriginLocation.LocationCode = cartesianArray[j][x].origin;
                originDestinationInfo[x].DestinationLocation.LocationCode = cartesianArray[j][x].destination;
            }
            output.push(originDestinationInfo);
        }
        // console.log(JSON.stringify(output));
        
        return output;
    }
  
};
