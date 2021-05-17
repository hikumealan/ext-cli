'use strict';
const { utils } = require('./utils');
const create = require('./create/index');
// const generate = require('./generate/index');
const template = require('./template/index');
const STATE = {
  options: ['create', 'generate', 'template', '--version', '--help'],
};

const getHelp = () => {
  utils.log(`Help documentation goes here.`);
  process.exit();
};
const getVersion = () => {
  utils.log(utils.getPackageVersion());
  process.exit();
};
utils.event.on('request-main', (req) => {
  const cmd = typeof (req || {}).cmd === 'string' ? req.cmd.toLowerCase() : '';
  switch (cmd) {
    case 'create': {
      create.init(req);
      break;
    }
    case 'generate': {
      utils.log(`Command not available - ['${cmd}'] coming soon`, 'error');
      process.exit(1);
      // generate.init(req);
      break;
    }
    case 'template': {
      template.init(req);
      break;
    }
    case '--version': {
      getVersion();
      break;
    }
    case '--help': {
      getHelp();
      break;
    }
    default: {
      utils.log(`Command not found ['${cmd}'] - Try using --help for assistance.`, 'error');
      utils.event.emit('request-prompt', req);
      break;
    }
  }
});
utils.event.on('request-prompt', (req) => {
  const options = STATE.options;
  const question = `Please provide a command you want to run. \nOptions: ${options.join(', ')} \n`;
  utils.ask.question(question, (input) => {
    utils.ask.close();
    input = (input || '').toLowerCase();
    if (input.length && options.includes(input)) {
      req.cmd = input;
      utils.event.emit('request-main', req);
    } else {
      utils.log(`Command not found: '${input}'`, 'error');
      utils.event.emit('request-prompt', req);
    }
  });
});

module.exports = {
  init: (packageJSON) => {
    if ((process || {}).argv && Array.isArray(process.argv) && process.argv.length > 2) {
      // Command has been received
      const params = process.argv.slice(2);
      const cmd = params[0];
      if (cmd === '--version') {
        getVersion();
      } else {
        const localVersion = utils.getSemanticVersion(utils.getPackageVersion());
        // check the server for the latest cli version
        const remoteVersion = utils.getSemanticVersion(
          utils.execSync({
            command: utils.commands('version:cli'),
            replacements: {
              $npm_config_cli: utils.getPackageName(),
              $npm_dir_path: process.argv[1],
            },
          })
        );
        if (localVersion < remoteVersion) {
          utils.log(`Nexus CLI upgrade available - Please upgrade at your earliest convenience.`, 'error');
          // CLI version is out-of-date -> forward request on via npx
          // utils.execSync(`npx --userconfig ${process.argv[1]}/.npmrc ${name} ${params.join(' ')} --self=${version}`);
          // process.exit();
        }
        // CLI version checks out and is good to process the command
        const request = {
          cmd,
          env: {
            argv: process.argv,
            root: process.argv[1],
            cwd: process.cwd(),
            dir: __dirname,
            loc: __filename,
            pkg: packageJSON,
          },
          params: process.argv.length > 2 ? process.argv.slice(2) : [],
        };
        utils.event.emit('request-main', request);
      }
    } else {
      getHelp();
    }
  },
};
