#!/usr/bin/env node

'use strict';
const packageJSON = require('./package.json');
const { utils } = require('./src/utils');
const cli = require('./src/cli');

const { engines } = packageJSON || {};
const { node, npm } = engines || {};
// Gather versions
const versions = {
  nodeMinVersion: utils.getSemanticVersion((node || '').split(' ')[0]),
  nodeVersion: utils.getSemanticVersion(
      utils.execSync({
        command: utils.commands('version:node'),
      })
  ),
  nodeMaxVersion: utils.getSemanticVersion((node || '').split(' ')[1]),
  npmMinVersion: utils.getSemanticVersion((npm || '').split(' ')[0]),
  npmVersion: utils.getSemanticVersion(
    utils.execSync({
      command: utils.commands('version:npm'),
    })
  ),
  npmMaxVersion: utils.getSemanticVersion((npm || '').split(' ')[1]),
};
// Check versions
const checks = {
  nodeMinMet: versions.nodeMinVersion !== '0.0.0' ? versions.nodeVersion >= versions.nodeMinVersion : true,
  nodeMaxMet: versions.nodeMinVersion !== '0.0.0' ? versions.nodeVersion <= versions.nodeMaxVersion : true,
  npmMinMet: versions.npmMinVersion !== '0.0.0' ? versions.npmVersion >= versions.npmMinVersion : true,
  npmMaxMet: versions.npmMaxVersion !== '0.0.0' ? versions.npmVersion <= versions.npmMaxVersion : true,
};
// For more info about node and npm versions checkout https://nodejs.org/dist/index.json
if (checks.nodeMinMet && checks.nodeMaxMet && checks.npmMinMet && checks.npmMaxMet) {
  // OS Env checks out and is good to process cmd
  cli.init(packageJSON);
} else {
  console.error('');
  console.error('**************************************************************');
  console.error('ERROR: System requirements not met.');
  if (!checks.nodeMinMet || !checks.nodeMaxMet) {
    console.error(`\t NODE version [${versions.nodeVersion}] does not meet: ${node}`);
  }
  if (!checks.npmMinMet || !checks.npmMaxMet) {
    console.error(`\t NPM version [${versions.npmVersion}] does not meet: ${npm}`);
  }
  console.error('\nPlease update your system accordingly and try again.\n');
  console.error('**************************************************************');
  console.error('');
}
