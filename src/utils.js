'use strict';
const _ = require('lodash');
const packageJSON = require('../package.json');
const fs = require('fs');
const path = require('path');
// const http = require('http');
// const https = require('https');
const readline = require('readline');
// eslint-disable-next-line camelcase
const child_process = require('child_process');

const events = require('events');
class SuperEventEmitter extends events.EventEmitter {
  emit(type, ...args) {
    super.emit('*', type, ...args);
    return super.emit(type, ...args) || super.emit('', type, ...args);
  }
}
const event = new SuperEventEmitter();
// const event = new events.EventEmitter();
// CATCH ALL EVENTS
// event.on('*', (type) => {
//   // log(`EVENT:: ${type}`);
// });
// event.on('', (type) => {
//   // processHandler('unhandledEvent', new Error(`Event '${type}' not found.`), arguments);
// });

const ask = {
  cli: null,
  question: function (question, callback) {
    if (typeof (this.cli || {}).question === 'function') {
      this.cli.question(question, callback);
    } else {
      this.cli = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      this.cli.question(question, callback);
    }
  },
  close: function () {
    if (typeof (this.cli || {}).close === 'function') {
      this.cli.close();
    }
    this.cli = null;
  },
};
const commands = (cmd) => {
  return ((packageJSON || {}).commands || {})[cmd] || '';
};
const execSync = ({ command, replacements, stdio }, silence = true) => {
  let result = null;
  if (_.isPlainObject(replacements) && !_.isEmpty(replacements)) {
    for (const [key, value] of Object.entries(replacements)) {
      command = replaceAll(command, key, value);
    }
  }
  try {
    if (stdio === true) {
      child_process.execSync(command, { stdio: 'inherit' });
    } else {
      result = child_process.execSync(command).toString();
      result = replaceAll(result, '\n', '');
      // result = separator + `{data: ${result}}` + separator;
    }
  } catch (e) {
    // result = e;
  }
  if (silence === false) {
    log(`>> ${command}: ${result}`);
  }
  return result;
};
const getPackageName = () => {
  // ((process || {}).env || {}).npm_package_name
  return packageJSON.name || '';
};
const getPackageVersion = () => {
  // ((process || {}).env || {}).npm_package_version
  return packageJSON.version || '';
};
const getSemanticVersion = (version) => {
  let result = typeof version === 'string' ? version.replace(/[^0-9.]+/g, '') : '';
  const semanticVersion = result ? result.split('.') : [];
  switch (semanticVersion.length) {
    case 0:
      result = '0.0.0';
      break;
    case 1:
      result += '.0.0';
      break;
    case 2:
      result += '.0';
      break;
    default:
      result = semanticVersion.slice(0, 3).join('.');
      break;
  }
  return result;
};
const log = (message, type) => {
  type = typeof message === 'string' ? (typeof type === 'string' ? type.toLowerCase() : '') : 'table';
  switch (type) {
    case 'table':
      console.table(message);
      break;
    case 'error':
      console.error('');
      console.error('==============================================================');
      console.error(`ERROR: ${message}`);
      console.error('==============================================================');
      console.error('');
      break;
    default:
      console.log(message);
      break;
  }
};
const npmrc = (user = 'fso-to', id = '7bc545d8-bf8c-477e-bb91-17a982c30c2e', token, email) => {
  token = typeof token === 'string' ? token : '';
  let content = `@nexus-ui-starter-kit:registry=https://fso-to.pkgs.visualstudio.com/7bc545d8-bf8c-477e-bb91-17a982c30c2e/_packaging/Nexus/npm/registry/
@nexus:registry=https://$npm_config_username.pkgs.visualstudio.com/$npm_config_id/_packaging/Nexus/npm/registry/
@ey-xd:registry=https://pkgs.dev.azure.com/EYCTXD/_packaging/EYCTXD/npm/registry/
@ey-studio-phl:registry=https://npm.ey-intuitive.com
registry=https://registry.npmjs.org/
always-auth=true
save-exact=true
; begin auth token
//$npm_config_username.pkgs.visualstudio.com/$npm_config_id/_packaging/Nexus/npm/registry/:username=$npm_config_username
//$npm_config_username.pkgs.visualstudio.com/$npm_config_id/_packaging/Nexus/npm/registry/:_password=[$npm_config_password]
//$npm_config_username.pkgs.visualstudio.com/$npm_config_id/_packaging/Nexus/npm/registry/:email=$npm_config_email
//$npm_config_username.pkgs.visualstudio.com/$npm_config_id/_packaging/Nexus/npm/:username=$npm_config_username
//$npm_config_username.pkgs.visualstudio.com/$npm_config_id/_packaging/Nexus/npm/:_password=[$npm_config_password]
//$npm_config_username.pkgs.visualstudio.com/$npm_config_id/_packaging/Nexus/npm/:email=$npm_config_email
; end auth token`;
  content = replaceAll(content, '$npm_config_username', user);
  content = replaceAll(content, '$npm_config_id', id);
  content = replaceAll(content, '$npm_config_password', token);
  content = replaceAll(content, '$npm_config_email', email);
  return content;
};
const parseJSON = (input) => {
  let json = typeof input === 'string' ? input : null;
  if (json.indexOf(separator) !== -1) {
    const parts = json.split(separator);
    switch (parts.length) {
      case 3:
        parts.shift();
        parts.pop();
        json = parts;
        break;
      default:
        json = null;
        break;
    }
  }
  try {
    json = JSON.parse(json);
  } catch (e) {
    json = null;
  }
  return json;
};
const parseOptions = (options) => {
  const dict = {};
  options.forEach((option) => {
    if (option.startsWith('-')) {
      const [key, value] = option.split('=');
      if (value) {
        dict[key.toLowerCase()] = value;
      } else if (key) {
        dict[key.toLowerCase()] = true;
      }
    }
  });
  return dict;
};
const readdirSyncRecursively = (location, result = []) => {
  const files = fs.existsSync(location) ? fs.readdirSync(location) : [];
  files.forEach((file) => {
    if (fs.statSync(location + '/' + file).isDirectory()) {
      result = readdirSyncRecursively(`${location}/` + file, result);
    } else {
      result.push(path.join(`${location}/`, file));
    }
  });
  return result;
};
const replaceAll = (str, key, value) => {
  // String.prototype.replaceAll = function(key, value) {
  //   return this.split(key).join(value);
  // };
  str = typeof str === 'string' ? str : '';
  if (str) {
    if (typeof key === 'string' && typeof value === 'string') {
      str = str.split(key).join(value);
    } else if (Array.isArray(key) && key.length && Array.isArray(value) && value.length) {
      const len = key.length <= value.length ? key.length : value.length;
      for (let i = 0; i < len; i++) {
        const k = typeof key[i] === 'string' ? key[i] : '';
        const v = typeof value[i] === 'string' ? value[i] : '';
        str = str.split(k).join(v);
      }
    }
    return str;
  } else {
    return null;
  }
};

const separator = '####';

const writeDirFileSync = (filepath, data, pkgJSON) => {
  try {
    const location = filepath.split('/');
    const file = location.pop();
    const filename = file === '_gitignore' ? '.gitignore' : file;
    const directory = location.join('/');
    if (directory) {
      fs.mkdirSync(directory, { recursive: true });
    }
    filepath = path.join(directory, filename);
    log(`Writing ${filepath}`);
    if (filename === 'package.json' && pkgJSON) {
      const pkg = JSON.parse(data);
      const merged = _.merge(pkg, pkgJSON);
      fs.writeFileSync(filepath, JSON.stringify(merged, null, 2), 'binary');
    } else {
      fs.writeFileSync(filepath, data, 'binary');
    }
  } catch (e) {
    log(e, 'error');
  }
};

module.exports = {
  utils: {
    ask,
    commands,
    event,
    execSync,
    getPackageName,
    getPackageVersion,
    getSemanticVersion,
    log,
    npmrc,
    parseJSON,
    parseOptions,
    readdirSyncRecursively,
    replaceAll,
    separator,
    writeDirFileSync,
  },
};
