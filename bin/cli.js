'use strict';

// DEPS
const fs = require('fs');
const path = require('path');
const events = require('events');
const {execSync} = require('child_process');
// IMPORTS
const {
    download,
    log,
    npmrc,
    prompt,
    readdirSyncRecursively,
    resolve
} = require('./utils');


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
            // create ${framework} ${project_name} --use-case=disputes --npmrc-token=${token} --${framework_cli_options}
            event.emit('create-project-main', req);
            break;
        case 'generate':
            //
            break;
        case 'template':
            // template --list => array of the folders in the template directory
            // template --info=${template} => list of all the files and folders in the template directory
            event.emit('template-command-main', req);
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
    prompt.question(question, (input) => {
        prompt.close();
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
// COMMAND - CREATE
event.on('create-project-main', (req, next) => {
    // TODO: Review and validate all values and jump to the correct step
    next = typeof next === 'string' ? next : '';
    switch (next) {
        case 'get-project-framework':
            event.emit('get-project-framework', req, 'get-project-name');
            break;
        case 'get-project-name':
            event.emit('get-project-name', req, 'get-project-options');
            break;
        case 'get-project-options':
            event.emit('get-project-options', req, 'init-project-setup');
            break;
        case 'init-project-setup':
            event.emit('init-project-setup', req, 'extend-project-setup');
            break;
        case 'extend-project-setup':
            event.emit('extend-project-setup', req);
            break;
        default:
            event.emit('create-project-main', req, 'get-project-framework');
            break;
    }
});
event.on('get-project-framework', (req, next) => {
    // PROJECT FRAMEWORK
    const cmd = req.input.cmd;
    const framework = req.input.framework;
    const options = req.cmds[cmd] || [];
    const question = `Please provide the framework you want to use. \nOptions: ${options.join(', ')} \n`;
    const isValid = (input) => {
        input = (input || '').toLowerCase();
        if (input.length && options.includes(input)) {
            req.input.framework = input;
            req.input.template = `ext-${input}`;
            return true;
        } else {
            return false;
        }
    };
    if (isValid(framework)) {
        event.emit('create-project-main', req, next);
    } else {
        prompt.question(question, (input) => {
            prompt.close();
            if (isValid(input)) {
                event.emit('create-project-main', req, next);
            } else {
                event.emit('get-project-framework', req, next);
            }
        });
    }
});
event.on('get-project-name', (req, next) => {
    // PROJECT NAME
    const project = req.input.project;
    const question = `Please provide a project name. \n`;
    const isValid = (input) => {
        input = (input || '').toLowerCase();
        if (input.length) {
            req.input.project = input;
            return true;
        } else {
            return false;
        }
    };
    if (isValid(project)) {
        event.emit('create-project-main', req, next);
    } else {
        prompt.question(question, (input) => {
            prompt.close();
            if (isValid(input)) {
                event.emit('create-project-main', req, next);
            } else {
                event.emit('get-project-name', req, next);
            }
        });
    }
});
event.on('get-project-options', (req, next) => {
    // PROJECT OPTS
    const options = req.options;
    const template = req.input.template;
    if (options.length) {
        req.input.options = [];
        options.forEach((option) => {
            const opt = option.split('=');
            const key = opt.length ? (opt[0] || '').toLowerCase() : '';
            const value = opt.length > 1 ? opt[1] : '';
            // Filter out my options
            switch (key) {
                case '--use-template':
                    if (value) {
                        const temp = `${template}-${value.toLowerCase()}`;
                        const location = path.join(__dirname, `../template/`);
                        if (fs.existsSync(location)) {
                            const temps = fs.readdirSync(location).map((file) => {
                                return path.join(location, file);
                            }).filter((loc) => {
                                return fs.statSync(loc).isDirectory();
                            });
                            temps.forEach((item, index) => {
                                temps[index] = item.replace(location, '');
                            });
                            if (temps.includes(temp)) {
                                req.input.template = temp;
                            } else {
                                log(`Template '${value}' not found.`, 'error')
                            }
                        } else {
                            log(`Templates not found.`, 'error')
                        }
                    }
                    break;
                case '--npmrc-token':
                    req.input.token = value.length ? value : '';
                    break;
                default:
                    req.input.options.push(option);
                    break;
            }
        });
    }
    event.emit('create-project-main', req, next);
});
event.on('init-project-setup', (req, next) => {
    // PROJECT INIT
    const {scripts} = req.packageJSON || {};
    const cmd = req.input.cmd;
    const framework = req.input.framework;
    const project = req.input.project;
    const token = req.input.token;
    const opts = req.input.options;
    // PROJECT PREP
    const preScript = (scripts[`pre${cmd}:${framework}`] || '').replace('$npm_config_project', project);
    if (preScript) {
        execSync(`${preScript}`, {stdio: 'inherit'});
    }
    // PROJECT SETUP
    const script = (scripts[`${cmd}:${framework}`] || '').replace('$npm_config_project', project);
    execSync(`${script}${(opts || []).length ? ' ' + opts.join(' ') : ''}`, {stdio: 'inherit'});
    // PROJECT FOLDER UPDATES
    process.chdir(`./${project}`);
    if (framework !== 'velocity') {
        // Add .npmrc
        fs.writeFileSync('.npmrc', npmrc(token));
    }
    // PROJECT COMPLETE
    const postScript = (scripts[`post${cmd}:${framework}`] || '').replace('$npm_config_project', project);
    if (postScript) {
        execSync(`${postScript}`, {stdio: 'inherit'});
    }
    event.emit('create-project-main', req, next);
});
event.on('extend-project-setup', (req) => {
    // PROJECT EXTEND
    // const {repository} = req.packageJSON || {};
    // const url = repository.url.replace('git+', '').replace('.git', '/');

    // https://github.com/hikumealan/ext-cli.git
    // https://github.com/hikumealan/ext-cli/tree/main/template/ext-angular-use-case/
    // https://raw.githubusercontent.com/hikumealan/ext-cli/main/template/ext-angular-use-case/
    const url = 'https://raw.githubusercontent.com/hikumealan/ext-cli/';
    const template = req.input.template;
    const remote = resolve(url, path.join( 'tree/main/template', template));
    const local = path.join(req.env.cwd, 'template', template);
    if (fs.existsSync(local) && false) {
        const files = readdirSyncRecursively(local);
        files.forEach((file) => {
            const directory = file.replace(`${local}/`, '').split('/');
            const filename = directory.pop();
            const dir = directory.join('/');
            if (dir) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(path.join(dir, filename === '_gitignore' ? '.gitignore' : filename), fs.readFileSync(file));
        });
    } else {
        console.log(new URL(remote));
    }
});


// =====================================================================================================================
// COMMAND - TEMPLATE
event.on('template-command-main', (req) => {
    let results = null;
    let location = '';
    const options = req.params || [];
    console.log(options);
    console.log(process.cwd());
    console.log(__dirname);
    console.log(__filename);
    console.log(path.join(__dirname, '../template'));
    // template --list => array of the folders in the template directory
    // template --info=${template} => list of all the files and folders in the template directory
    options.forEach((option) => {
        const opt = option.split('=');
        const key = opt.length ? (opt[0] || '').toLowerCase() : '';
        const value = opt.length > 1 ? (opt[1] || '').toLowerCase() : '';
        switch (key) {
            case '--list':
                location = path.join(__dirname, '../template');
                if (fs.existsSync(location)) {
                    results = fs.readdirSync(location).map((file) => {
                        return path.join(location, file);
                    }).filter((loc) => {
                        return fs.statSync(loc).isDirectory();
                    });
                    results.forEach((item, index) => {
                        results[index] = item.replace(`${location}/`, '');
                    });
                }
                return;
            case '--info':
                location = path.join(__dirname, `../template/${value}`);
                if (fs.existsSync(location)) {
                    results = readdirSyncRecursively(path.join(__dirname, `../template/${value}`));
                    results.forEach((item, index) => {
                        // results[index] = item.replace(path.join(location, '../'), '');
                        results[index] = item.replace(`${location}/`, '');
                    });
                }
                return;
            default:
                //
                break;
        }
    });
    if (results) {
        console.log('================================================================================================');
        console.log(results);
        console.log('================================================================================================');
    } else {
        //
    }
});
event.on('template-command-prompt', (req) => {
    const options = req.cmds.options;
    const question = `Please provide a command you want to run. \nOptions: ${options.join(', ')} \n`;
    prompt.question(question, (input) => {
        prompt.close();
        input = (input || '').toLowerCase();
        if (input.length && options.includes(input)) {
            req.input.cmd = input;
            event.emit('request-main', req);
        } else {
            event.emit('request-prompt', req);
        }
    });
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
            options: ['create', 'generate', 'template'],
            create: ['velocity', 'angular', 'react', 'vue', 'angular-ionic', 'react-ionic', 'vue-ionic', 'ionic-angular'],
            generate: ['component']
        },
        env: {
            cwd: process.cwd(),
            dir: __dirname,
            loc: __filename
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
