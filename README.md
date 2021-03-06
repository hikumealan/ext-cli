# ext-cli

Wrapper tooling for extending CLIs

## Create Command

`npx https://github.com/hikumealan/ext-cli create {framework} {project-name} --use-template={custom-template-name} --npmrc-token={token} {framework-cli-options}`

### Options

Frameworks: 'velocity', 'angular', 'react', 'vue', 'angular-ionic', 'react-ionic', 'vue-ionic', 'ionic-angular'

- Angular wraps the `@angular/cli`
- React wraps the `create-react-app`
- Vue wraps the `@vue/cli`
- Ionic wraps the `@ionic/cli`

## Template Command

- List all Templates:

`npx https://github.com/hikumealan/ext-cli template --list`

- List all files in a Template:

`npx https://github.com/hikumealan/ext-cli template --info={template-name}`

- Get all files in a Template:

`npx https://github.com/hikumealan/ext-cli template --get={template-name}`

- Get an individual file in a Template:

`npx https://github.com/hikumealan/ext-cli template --get-file={template-name}/{path-to-file}/{file-name}`

See `template` folders for more details on their contents

## Build and Test

TODO: Describe and show how to build your code and run the tests.
