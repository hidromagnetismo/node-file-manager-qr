

import { networkInterfaces } from "os";
import optimist from 'optimist';

export default {
    ipAddresses: () => {
        const nets = networkInterfaces();
        const results = Object.create(null); // Or just '{}', an empty object
        
        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
                if (net.family === 'IPv4' && !net.internal) {
                    if (!results[name]) {
                        results[name] = [];
                    }
                    results[name].push(net.address);
                }
            }
        }
        
        var ips = [];
        
        Object.keys(results).map(function(key, index) {
            ips.push(results[key][0]);
        });
        
        return ips;
        
    },
    port: () => {

        let argv = optimist
        .usage(['USAGE: $0 [-p <port>] [-d <directory>]'])
        .option('port', {
            alias: 'p',
            default: process.env.FM_PORT || process.env.PORT || 5000,
            description: 'Server Port'
        })
        .argv;

        return argv.port;
    }
}

