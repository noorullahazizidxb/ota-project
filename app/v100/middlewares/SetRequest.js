module.exports = {
    setRequest(req) {
    // console.log(req.connection.socket.remoteAddress);
        let ip =
    req.headers['r-ip'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket
    ? req.connection.socket.remoteAddress
    : null);
        let lri = req.body.lri;
        req.body = Object.assign({}, req.body, req.query, req.headers, { ip }, { lri });
    
        return req;
    }
};
