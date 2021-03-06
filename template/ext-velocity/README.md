# Introduction 
Velocity - NodeJS service providing a basic starter kit for UI Demos (includes: SPA Web Server & API Proxy/Mock Server)

# Getting Started with Velocity
REQUIRES: [NodeJS](https://nodejs.org/en/download/) - see [installation instructions](https://nodejs.org/en/download/package-manager/)
1. Edit the `.env` configuration files for your needs
2. Modify the contents of the `.www` folder for your needs (be sure to update the `.env` for subfolder contexts)
3. Run Velocity with `npm start` then make requests to the location configured in the `.env`
4. Any `NON-API` request will be served from the `.www` folder with `404`'s redirected to the `index`
5. If in `Proxy` mode with `Recording` enabled results will populate the `.mocks` folder
6. If in `Mock` mode the `.mocks` folder will be served with a fallback to `Proxy` requests

## Setup SSL
Run the following commands:
1. `openssl genrsa -out key.pem`
2. `openssl req -new -key key.pem -out csr.pem`
3. `openssl x509 -req -days 9999 -in csr.pem -signkey key.pem -out cert.pem`
4. `rm csr.pem`

Please visit [NodeJS Docs](https://nodejs.org/en/knowledge/HTTP/servers/how-to-create-a-HTTPS-server/) for more information.

## Setup WWW
Edit the contents of the `www` folder to serve the static files.

NOTE: SPAs placed in a `subfolder` need to be configured correctly to run with a `base href`

## Build and Test
TODO: Describe and show how to build your code and run the tests. 
