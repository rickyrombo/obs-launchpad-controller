const Client = require('node-ssdp').Client;

exports.findNanoleafAddress = function findNanoleafAddress(timeout) {
    return new Promise((resolve, reject) => {
        const client = new Client();
        client.on('response', (headers, statusCode, rinfo) => {
            if (headers.ST === 'nanoleaf_aurora:light') {
                console.log('nanoleaf found', rinfo);
                console.log(headers);
                resolve(rinfo.address);
            }
        });
        console.log('searching for nanoleaf...');
        client.search('nanoleaf_aurora:light');
        setTimeout(() => { reject('Timed out'); }, timeout);
    });
}