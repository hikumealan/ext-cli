'use strict';

// DEPS
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const readline = require('readline');

// EXAMPLES
// function download() {
//     const file = fs.createWriteStream("file.jpg");
//     const request = http.get("http://i3.ytimg.com/vi/J---aiyznGQ/mqdefault.jpg", function(response) {
//         response.pipe(file);
//     });
// }
// function getPipInstaller() {
//     // install pip
//     return new Promise((resolve, reject) => {
//         const pipFilePath = path.join(__dirname, "get-pip.py");
//         if (fs.existsSync(pipFilePath)) return resolve(pipFilePath);
//
//         const file = fs.createWriteStream(pipFilePath);
//         const request = https.get(pipUrl, function(response) {
//             response.pipe(file);
//             file.on("finish", function() {
//                 file.close(() => {
//                     resolve(pipFilePath);
//                 });
//             });
//             file.on("error", function(err) {
//                 fs.unlink(pipFilePath);
//                 reject(err);
//             });
//         });
//     });
// }
// function downloadFile(url, dest, cb) {
//     console.log('Downloading %s', url);
//     var file = fs.createWriteStream(dest);
//
//     var req = request.get(url);
//     req.pipe(file).on('error', function(err) { // Handle errors
//         fs.unlink(dest); // Delete the file async. (But we don't check the result)
//         if (cb) cb(err.message);
//     });
//
//     file.on('finish', function() {
//         file.close(cb);  // close() is async, call cb after close completes.
//     });
// }
// function downloadPromise (url, savepath) {
//     return new Promise((resolve, reject) => {
//         const http = require('http')
//         const fs = require('fs')
//         if (fs.existsSync(savepath)) return resolve()
//         const outfile = fs.createWriteStream(savepath)
//         http.get(url, (res) => {
//             res.pipe(outfile)
//             res.on('end', () => {
//                 outfile.close()
//                 resolve()
//             })
//         })
//             .on('error', (err) => reject(err))
//     })
// }
// const save = (vpns) => {
//     return new Promise((resolve, reject) => {
//         const writer = fs.createWriteStream(filePath, { overwrite: true });
//         writer
//             .on('open', () => {
//                 vpns = vpns.sort((a, b) => (b.score - a.score));
//                 const chain = vpns.slice(0, 2).map((vpn) => {
//                     return new Promise(resolve => writer.write(vpn.config, resolve));
//                 });
//
//                 Promise.all(chain)
//                     .then(() => writer.close());
//             })
//             .on('error', reject)
//             .once('close', resolve);
//     });
// }

// EXPORTS
const ask = {
    cli: null,
    question: function (question, callback) {
        if (typeof (this.cli || {}).question === 'function') {
            this.cli.question(question, callback);
        } else {
            this.cli = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            this.cli.question(question, callback);
        }
    },
    close: function () {
        if (typeof (this.cli || {}).close === 'function') {
            this.cli.close();
        }
        this.cli = null;
    }
};
const download = (url, des, cb) => {
    const src = new URL(url);
    const file = fs.createWriteStream(des);
    const req = (src || {}).protocol === 'https:' ? https : (src || {}).protocol === 'http:' ? http : null;
    const res = () => {
        console.log(arguments);
        if (typeof cb === 'function'){
            cb(arguments);
        }
    };
    try{
        req.get(src.href, function(response) {
            response.pipe(file);
            file.on('finish', function() {
                file.close(res);
            });
        }).on('error', function(error) {
            fs.unlink(des, (err) => {
                if (err){
                    res({error, err});
                } else {
                    res(error);
                }
            });
        });
    } catch (e) {
        res(e);
    }
};
const log = (message, type) => {
    // TODO: Manage other message types i.e. for obj use console.table()
    message = typeof message === 'string' ? message : '';
    type = typeof type === 'string' ? type.toLowerCase() : '';
    switch (type) {
        case 'error':
            console.error('');
            console.error('========================================================');
            console.error(`ERROR: ${message}`);
            console.error('========================================================');
            console.error('');
            break;
        default:
            console.log(message);
            break;
    }
};
const npmrc = (token) => {
    token = typeof token === 'string' ? token : '';
    return `registry=https://registry.npmjs.org/
@nexus:registry=https://fso-to.pkgs.visualstudio.com/7bc545d8-bf8c-477e-bb91-17a982c30c2e/_packaging/Nexus/npm/registry/
always-auth=true
save-exact=true
; begin auth token
//fso-to.pkgs.visualstudio.com/7bc545d8-bf8c-477e-bb91-17a982c30c2e/_packaging/Nexus/npm/registry/:username=fso-to
//fso-to.pkgs.visualstudio.com/7bc545d8-bf8c-477e-bb91-17a982c30c2e/_packaging/Nexus/npm/registry/:_password=[$npm_config_password]
//fso-to.pkgs.visualstudio.com/7bc545d8-bf8c-477e-bb91-17a982c30c2e/_packaging/Nexus/npm/registry/:email=npm requires email to be set but doesn't use the value
//fso-to.pkgs.visualstudio.com/7bc545d8-bf8c-477e-bb91-17a982c30c2e/_packaging/Nexus/npm/:username=fso-to
//fso-to.pkgs.visualstudio.com/7bc545d8-bf8c-477e-bb91-17a982c30c2e/_packaging/Nexus/npm/:_password=[$npm_config_password]
//fso-to.pkgs.visualstudio.com/7bc545d8-bf8c-477e-bb91-17a982c30c2e/_packaging/Nexus/npm/:email=npm requires email to be set but doesn't use the value
; end auth token`.replace(/\$npm_config_password/g, token);
};
const readdirSyncRecursively = (location, results=[]) => {
    const files = fs.existsSync(location) ? fs.readdirSync(location) : [];
    files.forEach((file) => {
        if (fs.statSync(location + '/' + file).isDirectory()) {
            results = readdirSyncRecursively(`${location}/` + file, results);
        } else {
            results.push(path.join(`${location}/`, file));
        }
    });
    return results;
};
const resolve = (from, to) => {
    const res = new URL(to, new URL(from, 'resolve://'));
    if (res.protocol === 'resolve:') {
        // `from` is a relative url
        const {pathname, search, hash} = res;
        return pathname + search + hash;
    }
    return res.toString();
};
module.exports = {
    ask,
    download,
    log,
    npmrc,
    readdirSyncRecursively,
    resolve
};
