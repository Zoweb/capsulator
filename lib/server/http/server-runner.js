/* The actual server */

const logger = require("../../console/logger").create("server.http.server-runner");

const GLOBAL_CONFIG = require("../../config");

const express = require("express"), app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const prettytime = require("pretty-time");

const path = require("path");

const proxyEvents = require("../socket/proxy-events");

const processManager = require("../../etc/process-manager");

module.exports = (function(serverFunction, onErrorFunction) {

    const port = GLOBAL_CONFIG.newPort();
    GLOBAL_CONFIG.temp[port] = serverFunction;

    let child = processManager.createNewProcess(path.join(__dirname, "server-runner-worker.js"), onErrorFunction);

    const eventListeners = {};

    child.on("message", message => {
        let cmd = message.type, data = message.data;

        switch (cmd) {
            case "EVENT":
                let eventName = data.eventName;
                let eventData = data.eventData;

                logger.debug("Recieved event", eventName, eventData);

                if (eventListeners[eventName] instanceof Array) eventListeners[eventName].forEach(listener => {
                    listener(...eventData);
                });

                break;
        }
    });

    child.send({
        type: "INFO",
        data: {
            port: port,
            serverFunction: serverFunction.toString().replace(/(^.*?{|}$)/g, ""),
            hostId: GLOBAL_CONFIG.hostId,
            otherData: GLOBAL_CONFIG.serverDataToSend
        }
    });

    let returnVal = {
        setName(){},
        get port() {
            return port;
        },
        on(event, callback) {
            logger.debug("Adding over-process event listener:", event);

            if (!eventListeners[event]) eventListeners[event] = [];

            eventListeners[event].push(callback);
        }
    };

    let listeners = {};
    returnVal.on("inner-event", e => {
        if (listeners[e.name]) listeners[e.name].forEach(listener => listener(e.data));
    });

    returnVal._addUserEvent = (event, callback) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(callback);
    };

    return returnVal;
});