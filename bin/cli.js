'use strict';

// DEPS
// const path = require('path');
const events = require('events');
// IMPORTS
const { ask, log } = require('./utils');
const create = require('./create');
const generate = require('./generate');
const template = require('./template');

// EVENTS
class SuperEventEmitter extends events.EventEmitter {
  emit(type, ...args) {
    super.emit('*', type, ...args);
    return super.emit(type, ...args) || super.emit('', type, ...args);
  }
}
const event = new SuperEventEmitter();
// const event = new events.EventEmitter();
event.on('request-main', (req) => {
  const cmd = req.input.cmd;
  switch (cmd) {
    case 'create':
      // create ${framework} ${project_name} --use-template=disputes --npmrc-token=${token} --${framework_cli_options}
      create.main(req);
      break;
    case 'generate':
      generate.main(req);
      break;
    case 'template':
      // template --list => array of the folders in the template directory
      // template --info=${template} => list of all the files and folders in the template directory
      // template --get=${template} => returns the contents of all the file in the template directory
      // template --get-file=${template_name}/${path_to_file}/${file_name} => returns the contents of the file requested
      template.main(req);
      break;
    case '--help':
      // TODO:
      // process.exit();
      break;
    case '--version':
      log(req.packageJSON.version);
      process.exit();
      break;
    default:
      log(`Command not found: '${cmd}'`, 'error');
      event.emit('request-prompt', req);
      break;
  }
});
event.on('request-prompt', (req) => {
  const options = req.cmds.options;
  const question = `Please provide a command you want to run. \nOptions: ${options.join(', ')} \n`;
  ask.question(question, (input) => {
    ask.close();
    input = (input || '').toLowerCase();
    if (input.length && options.includes(input)) {
      req.input.cmd = input;
      event.emit('request-main', req);
    } else {
      log(`Command not found: '${input}'`, 'error');
      event.emit('request-prompt', req);
    }
  });
});
// CATCH ALL EVENTS
event.on('*', (type) => {
  if (process.env.NODE_ENV !== 'production') {
    log(`CLI EVENT:: ${type}`);
  }
});
event.on('', (type) => {
  processHandler('unhandledEvent', new Error(`Event '${type}' not found.`), arguments);
});

// EXPORTS
const init = (packageJSON) => {
  try {
    event.emit('request-main', {
      args: [...arguments],
      argv: [...process.argv],
      params: process.argv.length > 2 ? process.argv.slice(2) : [],
      options: process.argv.length > 5 ? process.argv.slice(5) : [],
      input: {
        cmd: process.argv.length > 2 ? (process.argv[2] || '').toLowerCase() : '',
        framework: process.argv.length > 3 ? (process.argv[3] || '').toLowerCase() : '',
        project: process.argv.length > 4 ? (process.argv[4] || '').toLowerCase() : '',
        template: process.argv.length > 3 ? `ext-${(process.argv[3] || '').toLowerCase()}` : '',
        token: '',
        options: [],
      },
      cmds: {
        options: ['create', 'generate', 'template', '--version', '--help'],
        create: ['velocity', 'angular', 'react', 'vue', 'angular-ionic', 'react-ionic', 'vue-ionic', 'ionic-angular'],
        generate: ['component'],
      },
      env: {
        cwd: process.cwd(),
        dir: __dirname,
        loc: __filename,
        repo: (((packageJSON || {}).repository || {}).url || '').replace('git+', '').replace('.git', '/'),
      },
      packageJSON,
    });
  } catch (e) {
    processHandler('catch', e);
  }
};
const processHandler = (event, error) => {
  try {
    ask.close();
    event = typeof event === 'string' ? event : '';
    if (event === 'exit') {
      const code = parseInt(error, 10);
      const exitCode = code || code === 0 ? code : 999;
      if (exitCode) {
        if (process.env.NODE_ENV !== 'production') {
          log(`ERROR EVENT:: ${event}`, 'error');
        }
        log(`Process exited with the code '${exitCode}'`, 'error');
      }
    } else {
      if (process.env.NODE_ENV !== 'production') {
        log(`ERROR EVENT:: ${event}`, 'error');
      }
      const stringify = (input) => {
        return JSON.stringify(
          input,
          (() => {
            const seen = new WeakSet();
            return (key, value) => {
              if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                  return;
                }
                seen.add(value);
              }
              return value;
            };
          })(),
          2
        );
      };
      const err = error ? (error.stack ? error.stack : error.message ? error.message : stringify(error)) : '';
      switch (event) {
        case 'catch':
          log(err, 'error');
          process.exit(998);
          break;
        case 'SIGINT':
        case 'SIGUSR1':
        case 'SIGUSR2':
          process.exit(997);
          break;
        case 'unhandledEvent':
        case 'uncaughtException':
        case 'unhandledRejection':
          // const file = path.join(process.cwd(), `error-${new Date().toISOString()}.log`);
          if (err) {
            log(err, 'error');
            // fs.writeFileSync(file, err);
            // log(`Please check the error log @ ${file} for more details.`, 'error');
          } else {
            log(event, 'error');
          }
          process.exit(996);
          break;
        default:
          process.exit(995);
          break;
      }
    }
  } catch (e) {
    console.error('');
    console.error('**** **** **** **** **** **** **** **** **** **** **** **** ****');
    console.error(e);
    console.error('**** **** **** **** **** **** **** **** **** **** **** **** ****');
    console.error('');
    process.exit(994);
  }
};
// const eventHandler = (options, code) => {
//     if (options.cleanup) {
//         console.log('clean');
//     }
//     if (code || code === 0) {
//         console.log(code);
//     }
//     if (options.exit){
//         process.exit();
//     }
// };
module.exports = {
  init,
  processHandler,
};
