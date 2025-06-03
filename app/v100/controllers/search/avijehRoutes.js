function routes() {
    return [
        {
            "origin": 'THR',
            "destination": 'KIH',
            "isForein": 2
        },
        {
            "origin": 'KIH',
            "destination": 'THR',
            "isForein": 2
        },
        {
            "origin": 'KER',
            "destination": 'KIH',
            "isForein": 2
        },
        {
            "origin": 'KIH',
            "destination": 'KER',
            "isForein": 2
        },
        {
            "origin": 'IFN',
            "destination": 'KIH',
            "isForein": 2
        },
        {
            "origin": 'KIH',
            "destination": 'IFN',
            "isForein": 2
        },
        {
            "destination": "SYZ",
            "origin": "KIH",
            "isForein": 2

        },
        {
            "destination": "KIH",
            "origin": "SYZ",
            "isForein": 2
        },
        {
            "origin": 'MHD',
            "destination": 'KIH',
            "isForein": 2
        },
        {
            "origin": 'KIH',
            "destination": 'MHD',
            "isForein": 2
        },
        {
            "origin": 'KIH',
            "destination": 'RAS',
            "isForein": 2
        },
        {
            "origin": 'RAS',
            "destination": 'KIH',
            "isForein": 2
        },
        {
            "origin": 'THR',
            "destination": 'GSM',
            "isForein": 2
        },
        {
            "origin": 'GSM',
            "destination": 'THR',
            "isForein": 2
        },
        {
            "origin": 'THR',
            "destination": 'MHD',
            "isForein": 2
        },
        {
            "origin": 'MHD',
            "destination": 'THR',
            "isForein": 2
        },
        {
            "destination": "SYZ",
            "origin": "THR",
            "isForein": 2

        },
        {
            "destination": "THR",
            "origin": "SYZ",
            "isForein": 2
        },
        
        {
            "origin": 'IKA',
            "destination": 'IST',
            "isForein": 1
        },
        {
            "origin": 'IST',
            "destination": 'IKA',
            "isForein": 1
        },
        {
            "origin": 'IKA',
            "destination": 'DXB',
            "isForein": 1
        },
        {
            "origin": 'DXB',
            "destination": 'IKA',
            "isForein": 1
        },
        {
            "origin": 'IKA',
            "destination": 'ESB',
            "isForein": 1
        },
        {
            "origin": 'ESB',
            "destination": 'IKA',
            "isForein": 1
        },
        {
            "destination": "DXB",
            "origin": "KIH",
            "isForein": 1
        },
        {
            "destination": "KIH",
            "origin": "DXB",
            "isForein": 1
        }

    ];
}
module.exports = {
    routes
};

