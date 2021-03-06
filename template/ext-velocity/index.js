// NodeJS Deps
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const events = require('events');
// Third-Party Deps
const env = require('dotenv');
const request = require('request');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const formidable = require('formidable');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

// Load Env Configuration
const config = env.config({
    path: './.env',
    encoding: 'utf8',
    // debug: process.env.DEBUG
});
if (config.error) {
    console.error(config.error);
    throw config.error;
}
const ENV = (process || {}).env || {};

// Events
const event = new events.EventEmitter();
event.on('manual-serve', function (req, res, context='') {
    const url = req.url || '';
    const route = url.split('/').join('');
    if (
        (route.length > context.length && url.toLowerCase().indexOf(`/${context.toLowerCase()}/`) === 0) ||
        (route.toLowerCase() === context.toLowerCase())
    ) {
        event.emit('static-serve', req, res, context);
    } else {
        // TODO: Handle non context route
        event.emit('static-serve', req, res, '');
    }
});
event.on('static-serve', function (req, res, context='') {
    const folder = ENV[`APP_WWW_${context}_FOLDER`] || ENV.APP_WWW_FOLDER;
    // Send all routes back to the index and passthrough any file requests
    const url = path.extname(req.url).indexOf('.') === -1 ? `/${ENV.APP_WWW_INDEX}` : req.url.toLowerCase().replace(`/${context}`.toLowerCase(), '');
    fs.readFile(path.join(__dirname, `${folder}${url}`), 'utf8', (err, data) => {
        if (err) {
            res.set('Content-Type', 'text/plain');
            res.status(404).send(err);
            // event.emit('request-index', req, res, context);
        } else {
            res.type(path.extname(url));
            // res.status(200).send(data);
            res.sendFile(path.join(__dirname, `/${folder}${url}`));
        }
    });
});
event.on('request-index', function (req, res, context='') {
    const folder = ENV[`APP_WWW_${context}_FOLDER`] || ENV.APP_WWW_FOLDER;
    const route = context ? `/${context}/` : '/';
    if (ENV.APP_WWW_MODE === 'REDIRECT') {
        res.redirect(route);
    } else {
        const index = path.join(__dirname, `/${folder}/${ENV.APP_WWW_INDEX}`);
        res.type(path.extname(index));
        res.sendFile(index);
    }
});
event.on('mock-request', function (req, res) {
    const url = (req.url || '').replace('?', '^');
    fs.readFile(path.join(__dirname, `${ENV.APP_MOCK_FOLDER}${url}.json`), 'utf8', (err, data) => {
        if (err) {
            event.emit('proxy-request', req, res);
        } else {
            console.log(`MOCKED :: ${url}`);
            res.set('Content-Type', 'application/json; charset=UTF-8');
            res.status(200).send(data);
        }
    });
});
event.on('proxy-request', function (req, res) {
    const protocol = ENV.PROXY_TO_PROTOCOL;
    const host = ENV.PROXY_TO_HOST;
    const port = ENV.PROXY_TO_PORT;
    const base = ENV.PROXY_TO_PATH;
    const target = `${protocol}://${host}${port > 0 ? ':' + port : ''}${base}`;
    const url = `${target}${req.url}`;
    const headers = {...req.headers};
    delete headers['host'];
    headers['host'] = host;
    const proxyReq = {
        url: url,
        method: req.method,
        timeout: ENV.PROXY_TIMEOUT,
        followRedirect: ENV.PROXY_FOLLOW_REDIRECT === 'true',
        maxRedirects: ENV.PROXY_MAX_REDIRECTS,
        headers: headers,
        gzip: ENV.PROXY_GZIP === 'true',
        jar: ENV.PROXY_JAR === 'true',
        // TODO: Manage different input submissions
        // https://github.com/request/request#forms
        // json: true,
        // form: body,
        // formData: body,
        // body: body
    };
    if (req.method !== 'GET' && req.body) {
        let body = req.body;
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch (e) {
                console.error(e);
            }
        }
        proxyReq.json = true;
        proxyReq.body = body;
        // TODO: Verify if body and content-length are synced
        // delete proxyReq.headers['content-length'];
        // proxyReq.headers['content-length'] = Buffer.byteLength(JSON.stringify(body), 'utf8');
    }
    console.log(`PROXY request :: ${req.url} => `);
    console.log(`${url}`);
    request(proxyReq, (error, response, body) => {
        const result = (response || {}).statusCode || 0;
        event.emit('record-response', result, req.url, body);
        if (error) {
            console.error(error);
            res.set('Content-Type', 'application/json; charset=UTF-8');
            res.status(result || 510).send(error);
        } else {
            res.set('Content-Type', 'application/json; charset=UTF-8');
            res.status(result || 200).send(body);
        }
    });
});
event.on('record-response', function (result, url, data) {
    const successful = result !== 0 && result < 300;
    if (ENV.APP_RECORD_RESPONSES === 'true' && successful) {
        url = url.replace('?', '^');
        let location = url.split('/');
        location.pop();
        location = location.length ? '/' + location.join('/') : url;
        console.log('location', location);
        fs.mkdir(`${path.join(__dirname, ENV.APP_MOCK_FOLDER)}${location}`, {recursive: true}, (err) => {
            if (err) {
                console.error(err);
            } else {
                // TODO: Verify if need to support other file types
                // url = path.extname(url).indexOf('.') === -1 ? `${url}.json` : url;
                const stream = fs.createWriteStream(`${path.join(__dirname, ENV.APP_MOCK_FOLDER)}${url}.json`, {flags: 'w'});
                stream.write(typeof data !== 'string' ? JSON.stringify(data) : data);
                stream.end();
            }
        });
    }
});

// Configure the Server
const app = express();
// FIX: helmet contentSecurityPolicy is too strong and results in the follow error - disable ONLY when using webserver
// Refused to execute inline script because it violates the following Content Security Policy directive: "script-src 'self'".
// Either the 'unsafe-inline' keyword, a hash ('sha256-AfR16mM39+mB9rrONDTHMZxK9AIif0dwi+9mz3sNgUY='), or a nonce ('nonce-...') is required to enable inline execution.
app.use(helmet(
    {contentSecurityPolicy: false}
    ));
app.use(compression());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.raw());
app.use(bodyParser.text());
app.use(bodyParser.json());
app.use(cookieParser());
// API Server - request handler
app.use((req, res, next) => {
    const content = req.header('Content-Type') || '';
    // Handle Form Data from a Post
    if (content.includes('multipart/form-data')) {
        const form = formidable({multiples: true});
        form.parse(req, (err, fields, files) => {
            if (err) {
                next(err);
                return;
            }
            req.file = files;
            req.body = fields;
            next();
        });
    } else {
        next();
    }
});
// API Server - error handler
app.use((err, req, res, next) => {
    // TODO: Handle Errors
    console.error(err);
});
const CORS = cors({
    origin(origin, callback) {
        callback(null, true);
    }, credentials: true
});
app.use(CORS);
app.options('*', CORS);
// API Server - interceptors
app.all(`${ENV.APP_API_ROUTE}/individuals/email/:email`, function (req, res, next) {
    console.log(`URL :: ${req.url} => `);
    const email = (req.params || {}).email || '';
    let url = (req.url || '').split('/');
    if (email.indexOf('@gamil.com') !== -1) {
        url.pop();
        url = url.join('/');
        req.url = `${url}/email@gmail.com`;
    }
    console.log(`${req.url}`);
    event.emit('mock-request', req, res);
});
// API Server - catch all
app.all(`${ENV.APP_API_ROUTE}/*`, function (req, res, next) {
    if (ENV.APP_MODE === 'PROXY') {
        event.emit('proxy-request', req, res);
    } else {
        event.emit('mock-request', req, res);
    }
});
// Manual File Serves - handle the direct file requests
app.get('/demo*', function (req, res) {
    event.emit('manual-serve', req, res, 'DEMO');
});
app.get('/sub*', function (req, res) {
    event.emit('manual-serve', req, res, 'SUB');
});
// Static Server - file server
app.use(express.static(path.join(__dirname, `/${ENV.APP_WWW_FOLDER}`)));
// Static Server - catch all which redirects to the index
app.get('/*', function (req, res) {
    event.emit('request-index', req, res);
});

// Startup the Server
const server = ENV.APP_PROTOCOL === 'http' ?
    http.createServer(app).listen(process.env.PORT) :
    https.createServer({
        key: fs.readFileSync(ENV.APP_KEY, 'utf8'),
        cert: fs.readFileSync(ENV.APP_CERT, 'utf8'),
        passphrase: ENV.APP_PASSPHRASE
    }, app).listen(process.env.PORT);
console.log(`**** VELOCITY server started @ ${new Date()} ****`);
console.table(server.address());
