# ext-cli
Wrapper tooling for extending CLIs

## Create Command
`npx https://github.com/hikumealan/ext-cli create {framework} {project-name} --use-template={custom-template-name} --npmrc-token={token} {framework-cli-options}`
### Options
Frameworks: 'velocity', 'angular', 'react', 'vue', 'angular-ionic', 'react-ionic', 'vue-ionic', 'ionic-angular'
* Angular wraps the `@angular/cli`
* React wraps the `create-react-app`
* Vue wraps the `@vue/cli`
* Ionic wraps the `@ionic/cli`

## Template Command
Get all Templates: `npx https://github.com/hikumealan/ext-cli template --list`

Get a list of all the files in a Template: `npx https://github.com/hikumealan/ext-cli template --info={template-name}`

Get the contents of a requested file from a Template: `npx https://github.com/hikumealan/ext-cli template --get={template-name}/{path-to-file}/{file-name}`

See `template` folders for more details

## Build and Test
TODO: Describe and show how to build your code and run the tests. 

