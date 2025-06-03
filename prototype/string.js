/* eslint-disable consistent-this */
/* eslint-disable no-extend-native */
String.prototype.replaceSqlParams = function(params) {
    let replaceString = this;
    if (Array.isArray(params) === true) {
        params.forEach((element) => {
            replaceString = replaceString.replace('?', escape(element));  
        }); 
    } else {
        replaceString = replaceString.replace('?', params);  
    }
    
    return replaceString;
};