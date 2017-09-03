/* basically just a module loading script, loads http and expressjs */

const express = require("express"), app = express();
const Http = require("http"), http = Http.Server(app);
const log = require("../../console/logger").create("host.http.app");

let currentServerPort = 0;

const httpProxy = function(port, mainServerPort) {
    currentServerPort = mainServerPort;

    log.debug("Preparing for use on port " + currentServerPort);

    app.use(function(req, res, next) {
        let path = req._parsedUrl.path;

        log.debug("Querying:", "http://localhost", ":", currentServerPort, path);

        try {
            Http.get("http://localhost:" + currentServerPort + path, (response) => {
                response.setEncoding("utf8");

                for (let header in response.headers) {
                    if (!response.headers.hasOwnProperty(header)) continue;
                    res.setHeader(header, response.headers[header]);
                }

                res.setHeader("X-Server", "Express");
                res.setHeader("X-Powered-By", "Capsulator");

                let rawData = "";
                response.on("data", (chunk) => rawData += chunk);
                response.on("end", () => {
                    res.send(rawData);
                    next();
                });
            });
        } catch (err) {}
    });

    http.listen(port, () => {
        log.info("Host is listening on *:" + port);
    });
};

const setPort = function(port) {
    if (typeof port !== "number") {
        throw new TypeError("port must be a number");
    }
    if (port < 1 || port > 65535) {
        throw new TypeError("port must be over 0 and under 65536");
    }

    currentServerPort = port;
};

module.exports = {
    express: {
        instance: express,
        app: app,
        loadProxy: httpProxy,
        setPort: setPort
    },
    http: {
        instance: Http,
        server: http
    }
};