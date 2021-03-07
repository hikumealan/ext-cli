'use strict';

// DEPS
const fs = require('fs');
const path = require('path');
const events = require('events');
const {execSync} = require('child_process');
// IMPORTS
const {
    ask,
    download,
    log,
    npmrc,
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
            // create ${framework} ${project_name} --use-template=disputes --npmrc-token=${token} --${framework_cli_options}
            event.emit('create-project-main', req);
            break;
        case 'generate':
            //
            break;
        case 'template':
            // template --list => array of the folders in the template directory
            // template --info=${template} => list of all the files and folders in the template directory
            // template --get=${template_name}/${path_to_file}/${file_name} => returns the contents of the file requested
            event.emit('template-command-main', req);
            break;
        case '--help':
            //
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
// COMMAND - CREATE
event.on('create-project-main', (req, next) => {
    const prompt = (value, question, validator, next) =>{
        const isValid = validator;
        if (isValid(value)) {
            event.emit('create-project-main', req, next);
        } else {
            ask.question(question, (input) => {
                ask.close();
                if (isValid(input)) {
                    event.emit('create-project-main', req, next);
                } else {
                    prompt('', question, validator, next);
                }
            });
        }
    };
    next = typeof next === 'string' ? next : '';
    switch (next) {
        case 'get-project-framework':
            const options = req.cmds[req.input.cmd] || [];
            prompt(
                req.input.framework,
                `Please provide the framework you want to use. \nOptions: ${options.join(', ')} \n`,
                (input) => {
                    input = (input || '').toLowerCase();
                    if (input.length && options.includes(input)) {
                        req.input.framework = input;
                        req.input.template = `ext-${input}`;
                        return true;
                    } else {
                        return false;
                    }
                },
                'get-project-name'
            );
            // event.emit('get-project-framework', req, 'get-project-name');
            break;
        case 'get-project-name':
            prompt(
                req.input.project,
                `Please provide a project name. \n`,
                (input) => {
                    input = (input || '').toLowerCase();
                    if (input.length) {
                        req.input.project = input;
                        return true;
                    } else {
                        return false;
                    }
                },
                'get-project-options'
            );
            // event.emit('get-project-name', req, 'get-project-options');
            break;
        case 'get-project-options':
            event.emit('get-project-options', req, 'init-project-setup');
            break;
        case 'get-project-token':
            prompt(
                req.input.token,
                `Please provide a npmrc token. \n`,
                (input) => {
                    if (input.length) {
                        req.input.token = input;
                        return true;
                    } else {
                        return false;
                    }
                },
                'init-project-setup'
            );
            // event.emit('get-project-token', req, 'init-project-setup');
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
        ask.question(question, (input) => {
            ask.close();
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
        ask.question(question, (input) => {
            ask.close();
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
    // create ${framework} ${project_name} --use-template=disputes --npmrc-token=${token} --${framework_cli_options}
    const {scripts} = req.packageJSON || {};
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
                        try {
                            const script = (scripts[`npx:template:list`] || '').replace(/\$npm_config_cli/g, req.env.repo);
                            const results = execSync(`${script}`).toString();
                            const {data} = JSON.parse(results);
                            if (data.includes(temp)) {
                                req.input.template = temp;
                            } else {
                                log(`Template '${value}' not found.`, 'error');
                            }
                        } catch (e) {
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
                                    log(`Template '${value}' not found.`, 'error');
                                }
                            } else {
                                log(`Templates not found.`, 'error');
                            }
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
    if (!req.input.token) {
        // TODO: Do you want to provide a token? (Y || N)
        ask.question(`Do you want to provide a token? (Yes/No)\n`, (input) => {
            ask.close();
            input = (input || '').toLowerCase();
            if (input.indexOf('y') === 0) {
                event.emit('create-project-main', req, 'get-project-token');
            } else {
                event.emit('create-project-main', req, next);
            }
        });
    } else {
        event.emit('create-project-main', req, next);
    }
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
    const preScript = (scripts[`pre${cmd}:${framework}`] || '').replace(/\$npm_config_project/g, project);
    if (preScript) {
        execSync(`${preScript}`, {stdio: 'inherit'});
    }
    // PROJECT SETUP
    const script = (scripts[`${cmd}:${framework}`] || '').replace(/\$npm_config_project/g, project);
    execSync(`${script}${(opts || []).length ? ' ' + opts.join(' ') : ''}`, {stdio: 'inherit'});
    // PROJECT FOLDER UPDATES
    process.chdir(`./${project}`);
    if (token) {
        // Add .npmrc
        fs.writeFileSync('.npmrc', npmrc(null, null, token));
    }
    // TODO: Decide when is the best time to run this
    // // PROJECT COMPLETE
    // const postScript = (scripts[`post${cmd}:${framework}`] || '').replace(/\$npm_config_project/g, project);
    // if (postScript) {
    //     execSync(`${postScript}`, {stdio: 'inherit'});
    // }
    event.emit('create-project-main', req, next);
});
event.on('extend-project-setup', (req) => {
    // PROJECT EXTEND
    const {scripts} = req.packageJSON || {};
    const template = req.input.template;
    try {
        const script = (scripts[`npx:template:info`] || '').replace(/\$npm_config_cli/g, req.env.repo).replace(/\$npm_config_template/g, template);
        const results = execSync(`${script}`).toString();
        const {data} = JSON.parse(results);
        if (data.length < 50) {
            log(`Cloning template files from ${template}:`);
            data.forEach((file) => {
                const directory = file.split('/');
                const filename = directory.pop();
                const dir = directory.join('/');
                if (dir) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                const script = (scripts[`npx:template:get`] || '').replace(/\$npm_config_cli/g, req.env.repo).replace(/\$npm_config_template_file/g, `${template}/${file}`);
                const content = execSync(`${script}`).toString();
                const {data} = JSON.parse(content);
                const location = path.join(dir, filename === '_gitignore' ? '.gitignore' : filename);
                log(`Copying ${location}`);
                fs.writeFileSync(location, data);
            });
        } else {
            // TODO: This will take too long
            log(data);
            const message = 'Too many files to copy remotely.';
            log(message, 'error');
            throw new Error(message);
        }
    } catch (e) {
        const local = path.join(req.env.cwd, 'template', template);
        if (fs.existsSync(local)) {
            const files = readdirSyncRecursively(local);
            files.forEach((file) => {
                const directory = file.replace(`${local}/`, '').split('/');
                const filename = directory.pop();
                const dir = directory.join('/');
                if (dir) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                const location = path.join(dir, filename === '_gitignore' ? '.gitignore' : filename);
                fs.writeFileSync(location, fs.readFileSync(file));
            });
        } else {
            // TODO: ?
            const message = 'Local files not found.';
            log(message, 'error');
            throw new Error(message);
        }
    }
    // TODO: Decide when is the best time to run this
    // PROJECT COMPLETE
    const postScript = (scripts[`post${cmd}:${framework}`] || '').replace(/\$npm_config_project/g, project);
    if (postScript) {
        execSync(`${postScript}`, {stdio: 'inherit'});
    }
});

// =====================================================================================================================
// COMMAND - TEMPLATE
event.on('template-command-main', (req) => {
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
                }
                return;
            case '--info':
                location = path.join(__dirname, `../template/${value}`);
                if (fs.existsSync(location)) {
                    const data = readdirSyncRecursively(path.join(__dirname, `../template/${value}`));
                    data.forEach((item, index) => {
                        data[index] = item.replace(`${location}/`, '');
                    });
                    results = {data};
                }
                return;
            case '--get':
                const file = value.split('/');
                location = path.join(__dirname, `../template/${file[0]}`);
                if (fs.existsSync(location)) {
                    location = path.join(__dirname, `../template/${value}`);
                    const data = fs.readFileSync(location).toString();
                    results = {data};
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
