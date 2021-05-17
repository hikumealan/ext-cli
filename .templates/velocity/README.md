# Introduction

Velocity - NodeJS service providing a basic starter kit for UI Demos (includes: SPA Web Server & API Proxy/Mock Server)

# Getting Started

REQUIRES: [NodeJS](https://nodejs.org/en/download/) - see [installation instructions](https://nodejs.org/en/download/package-manager/)

1. Modify the `.env` configuration file to your needs
2. Run service `npm start` and make requests to the servers via the urls
3. Any `NON-API` request will be served from the `.www` folder with `404`'s redirected to the `index`
4. If in `Proxy` mode with `Recording` enabled results will populate the `.mocks` folder
5. If in `Mock` mode the `.mocks` folder will be served with a fallback to `Proxy` requests

# Build and Test

TODO: Describe and show how to build your code and run the tests.

# Contribute

TODO: Explain how other users and developers can contribute to make your code better.
