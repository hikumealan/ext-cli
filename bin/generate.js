'use strict';

// DEPS
// const fs = require('fs');
// const path = require('path');
// const {execSync} = require('child_process');
// IMPORTS
// const {
//     ask,
//     download,
//     log,
//     npmrc,
//     readdirSyncRecursively,
//     resolve
// } = require('./utils');

const init = '';
const main = (req, next=init) => {
    next = typeof next === 'string' ? next : '';
    switch (next) {
        case '':
            // TODO:
            break;
        default:
            main(req, init);
            break;
    }
};

// EXPORTS
module.exports = {
    main
};
