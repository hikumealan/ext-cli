'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { utils } = require('../utils');
const { name } = require('../../package.json');
const STATE = {
  templatePath: '../../.templates',
  init: 'get-project-framework',
  options: ['angular', 'react', 'vue', 'velocity', 'angular-ionic', 'react-ionic', 'vue-ionic', 'ionic-angular'],
  req: null,
  env: null,
  opts: [],
};

const prompt = (value, question, validator, next) => {
  const isValid = validator;
  if (isValid(value)) {
    main(next);
  } else {
    utils.ask.question(question, (input) => {
      utils.ask.close();
      if (isValid(input)) {
        main(next);
      } else {
        prompt('', question, validator, next);
      }
    });
  }
};

const main = (next) => {
  next = typeof next === 'string' ? next : '';
  switch (next) {
    case 'get-project-framework': {
      // Set the project framework
      const options = STATE.options;
      prompt(
        STATE.req.framework,
        `Please provide the framework you want to use. \nOptions: ${options.join(', ')} \n`,
        (input) => {
          input = typeof input === 'string' ? (input || '').toLowerCase() : '';
          if (input.length && options.includes(input)) {
            STATE.req.framework = input;
            return true;
          } else {
            return false;
          }
        },
        'get-project-name'
      );
      break;
    }
    case 'get-project-name': {
      // Set the project name
      prompt(
        STATE.req.project,
        `Please provide a project name. \n`,
        (input) => {
          input = typeof input === 'string' ? input : '';
          if (input.length) {
            STATE.req.project = input;
            return true;
          } else {
            return false;
          }
        },
        'get-project-options'
      );
      break;
    }
    case 'get-project-options': {
      // Filter and Valid the project options
      projectOptions('init-project-setup');
      break;
    }
    case 'get-project-token': {
      prompt(
        STATE.req.token,
        `Please provide your .npmrc token. \n`,
        (input) => {
          input = typeof input === 'string' ? input : '';
          if (input.length) {
            STATE.req.token = input;
            return true;
          } else {
            return false;
          }
        },
        'init-project-setup'
      );
      break;
    }
    case 'init-project-setup': {
      projectSetup('extend-project-setup');
      break;
    }
    case 'extend-project-setup': {
      projectComplete();
      break;
    }
    default: {
      main(STATE.init);
      break;
    }
  }
};

const projectOptions = (next) => {
  const { commands } = STATE.env.pkg || {};
  const options = STATE.req.options;
  let templates = [];
  try {
    // Load Templates remotely
    const results = utils.execSync(commands['template:list'], {
      $npm_config_cli: ((process || {}).env || {}).npm_package_name || name,
      $npm_dir_path: process.argv[1],
    });
    const { data } = utils.parseJSON(results);
    if (!Array.isArray(data)) {
      throw new Error('Not an Array');
    }
    templates = data;
  } catch (e) {
    // Load Templates locally
    templates = [];
    const location = path.join(__dirname, `${STATE.templatePath}/`);
    if (fs.existsSync(location)) {
      templates = fs
        .readdirSync(location)
        .map((file) => {
          return path.join(location, file);
        })
        .filter((loc) => {
          return fs.statSync(loc).isDirectory();
        });
      templates.forEach((item, index) => {
        templates[index] = item.replace(location, '');
      });
    }
  }
  options.forEach((option) => {
    const [key, value] = option.split('=');
    // Filter out Nexus options
    switch (key.toLowerCase()) {
      case '--use-template':
        STATE.req.template = value.length ? `${STATE.req.framework}-${value}` : `${STATE.req.framework}`;
        break;
      case '--use-token':
        STATE.req.token = value.length ? value : '';
        break;
      default:
        STATE.opts.push(option);
        break;
    }
  });
  // Validate template
  STATE.req.template = STATE.req.template ? STATE.req.template : `${STATE.req.framework}`;
  if (Array.isArray(templates) && templates.length) {
    STATE.req.template = templates.includes(STATE.req.template) ? STATE.req.template : `${STATE.req.framework}`;
  }
  // Check if token is needed
  // if (!STATE.req.token) {
  //   utils.ask.question(`Do you need to provide a .nmprc token? (Yes|No)\n`, (input) => {
  //     utils.ask.close();
  //     input = (input || '').toLowerCase();
  //     if (input.startsWith('y')) {
  //       main('get-project-token');
  //     } else {
  //       main(next);
  //     }
  //   });
  // } else {
  //   main(next);
  // }
  main(next);
};
const projectSetup = (next) => {
  // PROJECT INIT
  const { commands } = STATE.env.pkg || {};
  const framework = STATE.req.framework;
  const project = STATE.req.project;
  const token = STATE.req.token;
  const opts = STATE.opts;
  // PROJECT PREP
  const prescript = utils.replaceAll(commands[`precreate:${framework}`] || '', '$npm_config_project', project);
  if (prescript) {
    execSync(`${prescript}`, { stdio: 'inherit' });
  }
  // PROJECT SETUP
  if (framework === 'velocity') {
    fs.mkdirSync(project, { recursive: true });
    process.chdir(`./${project}`);
  }
  const script = utils.replaceAll(commands[`create:${framework}`] || '', '$npm_config_project', project);
  execSync(`${script}${(opts || []).length ? ' ' + opts.join(' ') : ''}`, { stdio: 'inherit' });
  // PROJECT FOLDER UPDATES
  if (framework === 'velocity') {
    process.chdir(`../`);
  }
  if (token) {
    utils.log(`Adding .npmrc`);
    const data = utils.npmrc(undefined, undefined, token);
    fs.writeFileSync(`./${project}/.npmrc`, data);
  }
  STATE.req.packageJSON = utils.parseJSON(fs.readFileSync(`./${project}/package.json`).toString());
  main(next);
};
const projectComplete = () => {
  // PROJECT EXTEND
  const { commands } = STATE.env.pkg || {};
  const framework = STATE.req.framework;
  const project = STATE.req.project;
  const template = STATE.req.template;
  try {
    utils.log(`Cloning template files from ${template} - This may take a few minutes.`);
    // TODO: look at git clone of sub-folder
    const results = utils.execSync(commands['template:get'], {
      $npm_config_cli: ((process || {}).env || {}).npm_package_name || name,
      $npm_dir_path: process.argv[1],
      $npm_config_template: template,
    });
    const { data } = utils.parseJSON(results);
    if (!Array.isArray(data)) {
      throw new Error('Not an Array');
    }
    utils.log(`Copying ${data.length} file(s):`);
    data.forEach((file) => {
      const keys = Object.keys(file);
      keys.forEach((key) => {
        const data = file[key];
        const filepath = path.join(project, key);
        // TODO: Binary files don't work
        utils.writeDirFileSync(filepath, data, STATE.req.packageJSON);
      });
    });
    // TODO: Get individual files one at a time from the template
    // TODO: refactor to use replaceAll
    // const script = (commands[`npx:template:info`] || '').replace(/\$npm_config_cli/g, STATE.req.env.repo).replace(/\$npm_config_template/g, template);
    // const results = execSync(`${script}`).toString();
    // const {data} = utils.parseJSON(results);
    // if (data.length < 50) {
    //     utils.log(`Cloning template files from ${template}:`);
    //     data.forEach((file) => {
    //         const directory = file.split('/');
    //         const filename = directory.pop();
    //         const dir = directory.join('/');
    //         if (dir) {
    //             fs.mkdirSync(dir, {recursive: true});
    //         }
    //         // TODO: refactor to use replaceAll
    //         const script = (commands[`npx:template:get-file`] || '').replace(/\$npm_config_cli/g, STATE.req.env.repo).replace(/\$npm_config_template_file/g, `${template}/${file}`);
    //         const content = execSync(`${script}`).toString();
    //         const {data} = utils.parseJSON(content);
    //         const location = path.join(dir, filename === '_gitignore' ? '.gitignore' : filename);
    //         utils.log(`Copying ${location}`);
    //         fs.writeFileSync(location, data);
    //     });
    // } else {
    //     // TODO: This will take too long
    //     utils.log(data);
    //     const message = 'Too many files to copy remotely.';
    //     utils.log(message, 'error');
    //     throw new Error(message);
    // }
  } catch (e) {
    const local = path.join(__dirname, STATE.templatePath, template);
    if (fs.existsSync(local)) {
      const files = utils.readdirSyncRecursively(local);
      files.forEach((file) => {
        const data = fs.readFileSync(file);
        const location = file.replace(`${local}/`, '').split('/');
        const filename = location.pop();
        const directory = `${project}/${location.join('/')}`;
        const filepath = path.join(directory, filename);
        utils.writeDirFileSync(filepath, data, STATE.req.packageJSON);
      });
    } else {
      // TODO: ?
      const message = 'Local files not found.';
      utils.log(message, 'error');
      throw new Error(message);
    }
  }
  // PROJECT COMPLETE
  process.chdir(`./${project}`);
  const postScript = utils.replaceAll(commands[`postcreate:${framework}`] || '', '$npm_config_project', project);
  if (postScript) {
    execSync(`${postScript}`, { stdio: 'inherit' });
  }
  execSync(`npm i`, { stdio: 'inherit' });
  process.chdir(`../`);
  utils.log(`SUCCESS:: Project was generated successfully!`);
  utils.log(`Check it out @ ${process.cwd()}`);
};

const init = (req) => {
  // utils.log(`\nRUNNING: ${process.env.npm_package_name}@${process.env.npm_package_version}\n\n`);
  STATE.env = (req || {}).env;
  // create ${framework} ${project_name} --use-template=disputes --use-token=${token} --${framework_cli_options}
  if ((req || {}).params && Array.isArray(req.params) && req.params.length) {
    // Command has been received
    const cmd = req.params.length > 0 ? (req.params[0] || '').toLowerCase() : '';
    const framework = req.params.length > 1 ? (req.params[1] || '').toLowerCase() : '';
    const project = req.params.length > 2 ? req.params[2] : '';
    const options = req.params.length > 3 ? req.params.slice(3) : [];
    const dict = utils.parseOptions(options);
    STATE.req = {
      cmd,
      framework,
      project,
      template: dict['--use-template'],
      token: dict['--use-token'],
      options,
    };
  }
  main(STATE.init);
};

module.exports = {
  init,
};
