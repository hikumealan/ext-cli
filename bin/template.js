'use strict';

// DEPS
const fs = require('fs');
const path = require('path');
// IMPORTS
const {
    // ask,
    // download,
    log,
    // npmrc,
    readdirSyncRecursively,
    // resolve
} = require('./utils');

const main = (req) => {
    let results = null;
    let location = '';
    const options = req.params || [];
    // template --list => array of the folders in the template directory
    // template --info=${template} => list of all the files and folders in the template directory
    // template --get=${template_name}/${path_to_file}/${file_name} => returns the contents of the file requested
    options.forEach((option) => {
        const opt = option.split('=');
        const key = opt.length ? (opt[0] || '').toLowerCase() : '';
        const value = opt.length > 1 ? (opt[1] || '').toLowerCase() : '';
        switch (key) {
            case '--list':
                location = path.join(__dirname, '../template');
                if (fs.existsSync(location)) {
                    const data = fs.readdirSync(location).map((file) => {
                        return path.join(location, file);
                    }).filter((loc) => {
                        return fs.statSync(loc).isDirectory();
                    });
                    data.forEach((item, index) => {
                        data[index] = item.replace(`${location}/`, '');
                    });
                    results = {data};
                } else {
                    // TODO: Error
                }
                return;
            case '--info':
                if (value) {
                    location = path.join(__dirname, `../template/${value}`);
                    if (fs.existsSync(location)) {
                        const data = readdirSyncRecursively(path.join(__dirname, `../template/${value}`));
                        data.forEach((file, index) => {
                            const filename = file.replace(`${location}/`, '');
                            data[index] = filename === '_gitignore' ? '.gitignore' : filename;
                        });
                        results = {data};
                    } else {
                        // TODO: Error
                    }
                } else {
                    // TODO: Error
                }
                return;
            case '--get':
                const file = value.split('/') || [];
                if (file.length) {
                    const directory = path.join(__dirname, `../template/${file[0]}`);
                    if (fs.existsSync(directory)) {
                        const filename = file.pop();
                        location = path.join(directory, filename === '.gitignore' ? '_gitignore' : filename);
                        const data = fs.readFileSync(location).toString();
                        results = {data};
                    } else {
                        // TODO: Error
                    }
                } else {
                    // TODO: Error
                }
                return;
            case '--get-all':
                if (value) {
                    location = path.join(__dirname, `../template/${value}`);
                    if (fs.existsSync(location)) {
                        const data = [];
                        const files = readdirSyncRecursively(path.join(__dirname, `../template/${value}`));
                        files.forEach((file, index) => {
                            const obj = {};
                            const filename = file.replace(`${location}/`, '');
                            obj[filename === '_gitignore' ? '.gitignore' : filename] = fs.readFileSync(file).toString();
                            data.push(obj);
                        });
                        results = {data};
                    } else {
                        // TODO: Error
                    }
                } else {
                    // TODO: Error
                }
                return;
            default:
                //
                break;
        }
    });
    if (results) {
        // TODO: wrap in tokens for parsing
        // console.log('####');
        log(JSON.stringify(results));
        // console.log('####');
    }
};

// EXPORTS
module.exports = {
    main
};
