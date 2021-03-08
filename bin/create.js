'use strict';

// DEPS
const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const _ = require('lodash');
// IMPORTS
const {
    ask,
    // download,
    log,
    npmrc,
    readdirSyncRecursively,
    // resolve
} = require('./utils');

const init = 'get-project-framework';
const main = (req, next=init) => {
    const prompt = (value, question, validator, next) =>{
        const isValid = validator;
        if (isValid(value)) {
            main(req, next);
        } else {
            ask.question(question, (input) => {
                ask.close();
                if (isValid(input)) {
                    main(req, next);
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
            break;
        case 'get-project-options':
            projectOptions(req, 'init-project-setup');
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
            break;
        case 'init-project-setup':
            projectSetup(req, 'extend-project-setup');
            break;
        case 'extend-project-setup':
            projectComplete(req);
            break;
        default:
            main(req, init);
            break;
    }
};

const projectOptions = (req, next) => {
    // PROJECT OPTS
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
                main(req, 'get-project-token');
            } else {
                main(req, next);
            }
        });
    } else {
        main(req, next);
    }
};
const projectSetup = (req, next) => {
    // PROJECT INIT
    const {scripts} = req.packageJSON || {};
    const cmd = req.input.cmd;
    const framework = req.input.framework;
    const project = req.input.project;
    const token = req.input.token;
    const opts = req.input.options;
    if (framework === 'velocity') {
        // PROJECT PREP
        const preScript = (scripts[`pre${cmd}:${framework}`] || '').replace(/\$npm_config_project/g, project);
        if (preScript) {
            execSync(`${preScript}`, {stdio: 'inherit'});
        }
        // PROJECT SETUP
        fs.mkdirSync(project, { recursive: true });
        process.chdir(`./${project}`);
        const script = (scripts[`${cmd}:${framework}`] || '').replace(/\$npm_config_project/g, project);
        execSync(`${script}${(opts || []).length ? ' ' + opts.join(' ') : ''}`, {stdio: 'inherit'});
        // PROJECT FOLDER UPDATES
        req.input.packageJSON = JSON.parse(fs.readFileSync('package.json').toString());
    } else {
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
            log(`Adding .npmrc`);
            const data = npmrc(undefined, undefined, token);
            fs.writeFileSync('.npmrc', data);
        }
        req.input.packageJSON = JSON.parse(fs.readFileSync('package.json').toString());
    }
    main(req, next);
};
const projectComplete = (req) => {
    // PROJECT EXTEND
    const {scripts} = req.packageJSON || {};
    const cmd = req.input.cmd;
    const framework = req.input.framework;
    const project = req.input.project;
    const template = req.input.template;
    try {
        log(`Cloning template files from ${template} - This may take a few minutes.`);
        const script = (scripts[`npx:template:get`] || '').replace(/\$npm_config_cli/g, req.env.repo).replace(/\$npm_config_template/g, template);
        const results = execSync(`${script}`).toString();
        const {data} = JSON.parse(results);
        log(`Copying ${data.length} file(s):`);
        data.forEach((file) => {
            const keys = Object.keys(file);
            keys.forEach((key) => {
                const data = file[key];
                const location = key.split('/');
                const filename = location.pop();
                const directory = location.join('/');
                if (directory) {
                    fs.mkdirSync(directory, { recursive: true });
                }
                log(`Writing ${key}`);
                if (filename === 'package.json' && req.input.packageJSON) {
                    const packageJSON = JSON.parse(data);
                    const merged = _.merge(packageJSON, req.input.packageJSON);
                    fs.writeFileSync(key, JSON.stringify(merged, null, 2));
                } else {
                    fs.writeFileSync(key, data);
                }
            });
        });
        // TODO: Get individual files one at a time from the template
        // const script = (scripts[`npx:template:info`] || '').replace(/\$npm_config_cli/g, req.env.repo).replace(/\$npm_config_template/g, template);
        // const results = execSync(`${script}`).toString();
        // const {data} = JSON.parse(results);
        // if (data.length < 50) {
        //     log(`Cloning template files from ${template}:`);
        //     data.forEach((file) => {
        //         const directory = file.split('/');
        //         const filename = directory.pop();
        //         const dir = directory.join('/');
        //         if (dir) {
        //             fs.mkdirSync(dir, { recursive: true });
        //         }
        //         const script = (scripts[`npx:template:get-file`] || '').replace(/\$npm_config_cli/g, req.env.repo).replace(/\$npm_config_template_file/g, `${template}/${file}`);
        //         const content = execSync(`${script}`).toString();
        //         const {data} = JSON.parse(content);
        //         const location = path.join(dir, filename === '_gitignore' ? '.gitignore' : filename);
        //         log(`Copying ${location}`);
        //         fs.writeFileSync(location, data);
        //     });
        // } else {
        //     // TODO: This will take too long
        //     log(data);
        //     const message = 'Too many files to copy remotely.';
        //     log(message, 'error');
        //     throw new Error(message);
        // }
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
                const data = fs.readFileSync(file);
                fs.writeFileSync(location, data);
            });
        } else {
            // TODO: ?
            const message = 'Local files not found.';
            log(message, 'error');
            throw new Error(message);
        }
    }
    // PROJECT COMPLETE
    const postScript = (scripts[`post${cmd}:${framework}`] || '').replace(/\$npm_config_project/g, project);
    if (postScript) {
        execSync(`${postScript}`, {stdio: 'inherit'});
    }
    log(`SUCCESS:: Project was generated successfully!`);
    log(`Check it out @ ${process.cwd()}`);
};

// EXPORTS
module.exports = {
    main
};
