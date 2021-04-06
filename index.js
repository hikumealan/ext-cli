#!/usr/bin/env node

'use strict';
const {execSync} = require('child_process');
const packageJSON = require('./package.json');
const {init, processHandler} = require('./bin/cli');

process.on('SIGINT', () => {
    processHandler('SIGINT', arguments);
});
process.on('uncaughtException', () => {
    processHandler('uncaughtException', arguments);
});
process.on('unhandledRejection', () => {
    processHandler('unhandledRejection', arguments);
});
process.on('exit', () => {
    processHandler('exit', arguments);
});

// Check engines versions
const {node, npm} = packageJSON.engines || {};
const versions = {
    nodeMinVersion: ((node || '').split(' ')[0] || '').replace(/[^0-9\.-]+/g, ''),
    nodeVersion: process.versions.node,
    nodeMaxVersion: ((node || '').split(' ')[1] || '').replace(/[^0-9\.-]+/g, ''),
    npmMinVersion: ((npm || '').split(' ')[0] || '').replace(/[^0-9\.-]+/g, ''),
    npmVersion: execSync(`npm --version`).toString().replace(/[^0-9\.-]+/g, ''),
    npmMaxVersion: ((npm || '').split(' ')[1] || '').replace(/[^0-9\.-]+/g, ''),
};
const checks = {
    nodeMinMet: (versions.nodeMinVersion ? versions.nodeVersion >= versions.nodeMinVersion : true),
    nodeMaxMet: (versions.nodeMaxVersion ? versions.nodeVersion <= versions.nodeMaxVersion : true),
    npmMinMet: (versions.npmMinVersion ? versions.npmVersion >= versions.npmMinVersion : true),
    npmMaxMet: (versions.npmMaxVersion ? versions.npmVersion <= versions.npmMaxVersion : true),
};
// For more info about node and npm versions checkout https://nodejs.org/dist/index.json
if (checks.nodeMinMet && checks.nodeMaxMet && checks.npmMinMet && checks.npmMaxMet){
        console.log(`\nRUNNING: ${process.env.npm_package_name}@${process.env.npm_package_version}\n\n`);
        console.table(process.env);
    init(packageJSON);
} else {
    console.error('');
    console.error('========================================================');
    console.error('ERROR: The required versions are not met.');
    console.table(versions);
    console.error('Please update your versions and try again.');
    console.error('========================================================');
    console.error('');
    process.exit(999)
}
