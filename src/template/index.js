'use strict';
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const { utils } = require('../utils');
const STATE = {
  templatePath: '../../.templates',
  useCases: ['disputes', 'merchant-insights', 'merchant-offers', 'mortgage', 'platform-manager'],
  ignoreFiles: ['.DS_Store', 'Thumbs.db'],
};

const main = (options) => {
  let results = null;
  // template --use-cases => array of all the use cases
  // template --list => array of the folders in the template directory
  // template --info=${template} => list of all the files and folders in the template directory
  // template --get=${template} => returns the contents of all the file in the template directory
  // template --get-file=${template_name}/${path_to_file}/${file_name} => returns the contents of the file requested

  for (const option of options) {
    const [key, value] = option.split('=');
    switch (key.toLowerCase()) {
      case '--use-cases': {
        // TODO: dynamically list all use cases
        const data = STATE.useCases;
        results = { data };
        break;
      }
      case '--list': {
        const data = getTemplateList();
        if (data) {
          results = { ...data };
        }
        break;
      }
      case '--info': {
        if (value) {
          const data = getTemplateDetails(value);
          if (data) {
            results = { ...data };
          }
        } else {
          // TODO: Input Error
        }
        break;
      }
      case '--get': {
        if (value) {
          const data = getTemplateDetails(value, true);
          if (data) {
            results = { ...data };
          }
        } else {
          // TODO: Input Error
        }
        break;
      }
      case '--get-file': {
        if (value) {
          const file = value.split('/');
          const template = file.shift();
          const name = file.pop();
          const filename = name === '.gitignore' ? '_gitignore' : name;
          const filepath = path.join(file.join('/'), filename);
          const templates = getTemplateList();
          // template list to validate against
          if ((templates || {}).data && Array.isArray(templates.data) && templates.data.length) {
            // validate template
            const index = _.findIndex(templates.data, (templateName) => {
              return templateName.toLowerCase() === template.toLowerCase();
            });
            if (index !== -1) {
              const data = getFileDetails(template, filepath, true);
              if (data) {
                results = { ...data };
              }
            } else {
              // TODO: Template invalid
            }
          } else {
            // TODO: Template list is empty
            const data = getFileDetails(template, filepath, true);
            if (data) {
              results = { ...data };
            }
          }
        } else {
          // TODO: Input Error
        }
        break;
      }
      default: {
        //
        break;
      }
    }
    if (results) {
      break;
    }
  }
  if (results) {
    // wrapped output in tokens for parsing response only
    utils.log(utils.separator);
    utils.log(JSON.stringify(results));
    utils.log(utils.separator);
  }
};

const getTemplateList = () => {
  const location = path.join(__dirname, `${STATE.templatePath}`);
  if (fs.existsSync(location)) {
    const data = fs
      .readdirSync(location)
      .map((file) => {
        return path.join(location, file);
      })
      .filter((loc) => {
        return fs.statSync(loc).isDirectory();
      });
    data.forEach((item, index) => {
      data[index] = item.replace(`${location}/`, '');
    });
    return { data };
  } else {
    return { data: [] };
  }
};

const getTemplateDetails = (template, returnData) => {
  const location = path.join(__dirname, `${STATE.templatePath}/${template}`);
  if (fs.existsSync(location)) {
    const data = [];
    const files = utils.readdirSyncRecursively(location);
    files.forEach((file) => {
      const filepath = file.replace(`${location}/`, '');
      const result = getFileDetails(template, filepath, returnData);
      if (result) {
        data.push(result);
      }
    });
    return { data };
  } else {
    // TODO: Location invalid
    return null;
  }
};

const getFileDetails = (template, filepath, returnData) => {
  const location = path.join(__dirname, `${STATE.templatePath}/${template}`);
  const file = filepath.split('/');
  const filename = file.pop();
  const directory = file.join('/');
  if (fs.existsSync(location)) {
    const index = _.findIndex(STATE.ignoreFiles, (ignoreFilename) => {
      // if filename is in the ignore list skip it
      return ignoreFilename.toLowerCase() === filename.toLowerCase();
    });
    if (index === -1) {
      if (returnData) {
        const obj = {};
        const file = path.join(location, directory, filename === '.gitignore' ? '_gitignore' : filename);
        // TODO: Check if file is binary and write the data as binary
        obj[filename === '_gitignore' ? '.gitignore' : filename] = fs.readFileSync(file).toString();
        return obj;
      } else {
        return `${directory ? directory + '/' : ''}${filename === '_gitignore' ? '.gitignore' : filename}`;
      }
    } else {
      // skip ignored files
      return null;
    }
  } else {
    // TODO: Location invalid
    return null;
  }
};

const init = (req) => {
  // template --use-cases => array of all the use cases
  // template --list => array of the folders in the template directory
  // template --info=${template} => list of all the files and folders in the template directory
  // template --get=${template} => returns the contents of all the file in the template directory
  // template --get-file=${template_name}/${path_to_file}/${file_name} => returns the contents of the file requested
  if ((req || {}).params && Array.isArray(req.params) && req.params.length) {
    main(req.params);
  }
};

module.exports = {
  init,
};
