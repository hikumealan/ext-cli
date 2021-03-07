'use strict';

// DEPS
const events = require('events');
// IMPORTS
const {
    ask,
    // download,
    log,
    // npmrc,
    // readdirSyncRecursively,
    // resolve
} = require('./utils');
const create = require('./create');
const generate = require('./generate');
const template = require('./template');


// =====================================================================================================================
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
            // template --get-all=${template} => returns the contents of all the file in the template directory
            // template --get=${template_name}/${path_to_file}/${file_name} => returns the contents of the file requested
            template.main(req);
            break;
        case '--help':
            // TODO:
            break;
        case '--version':
            log(req.packageJSON.version);
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
            event.emit('request-prompt', req);
        }
    });
});
// CATCH ALL EVENTS
event.on('*', (type) => {
    // log(`EVENT:: ${type}`);
});
event.on('', (type) => {
    log(`Event '${type}' not found.`, 'error');
    process.exit(998);
});


// =====================================================================================================================
// EXPORTS
const init = (packageJSON) => {
    event.emit('request-main', {
        args: [...arguments],
        argv: [...process.argv],
        params: process.argv.length > 2 ? process.argv.slice(2) : [],
        options: process.argv.length > 5 ? process.argv.slice(5) : [],
        input: {
            cmd: (process.argv.length > 2 ? (process.argv[2] || '').toLowerCase() : ''),
            framework: (process.argv.length > 3 ? (process.argv[3] || '').toLowerCase() : ''),
            project: (process.argv.length > 4 ? (process.argv[4] || '').toLowerCase() : ''),
            template: (process.argv.length > 3 ? `ext-${(process.argv[3] || '').toLowerCase()}` : ''),
            token: '',
            options: [],
        },
        cmds: {
            options: ['create', 'generate', 'template', '--version', '--help'],
            create: ['velocity', 'angular', 'react', 'vue', 'angular-ionic', 'react-ionic', 'vue-ionic', 'ionic-angular'],
            generate: ['component']
        },
        env: {
            cwd: process.cwd(),
            dir: __dirname,
            loc: __filename,
            repo: (((packageJSON || {}).repository || {}).url || '').replace('git+', '').replace('.git', '/')
        },
        packageJSON
    });
};
const processHandler = (event) => {
    event = typeof event === 'string' ? event.toLowerCase() : '';
    switch (event) {
        case 'sigint':
        case 'uncaughtException':
        case 'unhandledRejection':
            // TODO: set the exit code
            // process.exit(code);
            break;
        case 'exit':
            //
            break;
        default:
            //
            break;
    }
};
module.exports = {
    init,
    processHandler
};
