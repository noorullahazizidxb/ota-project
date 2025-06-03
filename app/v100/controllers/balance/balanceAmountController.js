
let urlModule = require('url');

const { default: axios } = require('axios');
async function getResults(prmAgency) {
    let response = {};
    let output = {};
    try {
        response = await axios.post(prmAgency.url + '/api/Partners/Generic/V7/CurrentBalance', {
            UserName: prmAgency.UserName,
            Password: prmAgency.Password
        });
        output = {
          
            Name : prmAgency.url,
            Data:response.data 
        };
        // console.log(response);
    } catch (e) {
        console.log(e);
        output = {
            Name : prmAgency.url,
            Data:null 
        };
    }
    // const mapEssentialInfo = ({volumeInfo}) => ({title: volumeInfo.title});

    return output;
}
function getSearchInput(prmRequest) {
    let input = [];
    for (let k = 0; k < prmRequest.data.length; k++) {
     
        let obj = {};
        obj.UserName = prmRequest.data[k].UserName;
        obj.url = new urlModule.URL(prmRequest.data[k].Url).origin;
        obj.Password =  prmRequest.data[k].Password;
        input.push(obj);
    }

    return input;
}
function *getSearched(prmList) {
    let currentIndex = 0;
    
    while (currentIndex < prmList.length) {
        const pageResults = getResults(prmList[currentIndex]);
        yield pageResults;
        currentIndex += 1;
    }
}


async function search(prmList) {
    let inputSearch = getSearchInput(prmList);
    // console.log(inputSearch);
    
    const pages = getSearched(inputSearch);
    let test = [];
    for await (const page of pages) {
            // console.log('Page Results : ');
            // console.log(page) //
        test.push(page);
    }
        
    return test;
}


async function index(req, res) {
   
    let request = req.body;
   
    let searchResult = await search(request);
        // console.log(searchResult);
    // let output = searchResult.filter((test) => test.Success && (test.data.CharterFlights.length > 0 || test.data.WebserviceFlights.length));
    
    res.json({
        Success: true,
        Items: searchResult
    });
   
    
}
module.exports = { index };
