/**
 * Copyright (c) 2017, zoweb
 *
 * See the license in the LICENSE file (downloaded with this repository, in the root folder)
 * By using this code, you agree to the license in the file specified (the MIT license)
 */

const log = require("../../console/logger");

const GLOBAL_CONFIG = require("../../config");

const express = require("express"), app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const prettytime = require("pretty-time");

const proxyEvents = require("../socket/proxy-events");

class EventEmitter {
    constructor(useMultiProcess) {
        this._events = {};
        this.multiprocess = useMultiProcess;
    }

    on(eventName, eventListener) {
        if (typeof eventName !== "string") throw new TypeError("Argument `eventName` must be of type String");
        if (typeof eventListener !== "function") throw new TypeError("Argument `eventListener` must be of type Function");

        eventName = eventName.split(" ");

        eventName.forEach(currentEventName => {
            if (!this._events[currentEventName]) this._events[currentEventName] = [];
            this._events[currentEventName].push(eventListener);
        });
    };

    off(eventName) {
        if (typeof eventName !== "string") throw new TypeError("Argument `eventName` must be of type String");

        eventName = eventName.split(" ");

        eventName.forEach(currentEventName => {
            delete this._events[currentEventName];
        });
    };

    emit(eventName, ...eventData) {
        if (typeof eventName !== "string") throw new TypeError("Argument `eventName` must be of type String");
        if (!(eventData instanceof Array)) eventData = [eventData];

        if (this._events["*"]) {
            this._events["*"].forEach(event => {
                if (typeof event !== "function") throw new TypeError("Event listener must be of type Function");

                event(eventName, ...eventData);
            });
        }

        eventName = eventName.split(" ");

        eventName.forEach(currentEventName => {
            if (this._events[currentEventName] instanceof Array) {
                this._events[currentEventName].forEach(eventListener => {
                    if (typeof eventListener !== "function") throw new TypeError("Event listener must be of type Function");

                    eventListener(...eventData);
                });
            }

            if (this.multiprocess) process.send({
                type: "EVENT",
                data: {
                    eventName: currentEventName,
                    eventData: eventData
                }
            });
        });
    };

    toString() {
        return "[object EventEmitter]";
    }

    valueOf() {
        return this.toString();
    }
}

class SocketClient {
    constructor(socket, clientId) {
        this._listeners = [];
        this._listenersObj = {};

        this._socket = socket;
        this._clientId = clientId;

        let _this = this;

        SocketClient._clients[clientId] = () => _this;
    }

    emit(event, data) {
        this._socket.emit(event, {
            emitData: data,
            clientId: this._clientId
        });
    }

    remove(event) {
        this._listeners.forEach((name) => {
            this._socket.removeAllListeners(name);
        });
        delete this._listenersObj[event];
    }

    on(event, callback) {
        if (!this._listenersObj[event]) {
            this._listenersObj[event] = [];
        }
        this._listenersObj[event].push(callback);

        if (!this._listeners.indexOf(event)) {
            this._listeners.push(event);
        }
        this._socket.on(event + " where client = " + this._clientId, callback);
    }

    _sendEvent(eventName, eventData) {
        const listeners = this._listenersObj[eventName];

        if (!listeners) return;

        listeners.forEach(listener => {
            if (typeof listener === "function") listener(eventData);
        });
    }

    static getClient(id) {
        return (SocketClient._clients[id] || (()=>{}))();
    };
    static deleteClient(id) {
        delete SocketClient._clients[id];
    }
}
SocketClient._clients = [];

const emitter = new EventEmitter(true);

function setNameTo(){}

function initalise(port, serverFunction, hostId) {
    const logger = log.create("server.runner:" + port);

    setNameTo = function(name) {
        logger.name = name;
    };

    logger.info("Initialising server runner...");

    const loadStart = process.hrtime();

    http.listen(port, () => {
        logger.debug(`Server listening on *:${port} after ${prettytime(process.hrtime(loadStart))}`);
        emitter.emit("ready", null, port);
    });

    io.on("connection", function(hostSocket) {
        proxyEvents.loadSocketProxyEvent(hostSocket);

        logger.debug("Host has connected to socket.");

        let socketConnectionEmitter = new EventEmitter();
        let serverIOEmitter = new EventEmitter();

        hostSocket.on("event " + hostId, eventData => {
            const name = eventData.eventName;
            const data = eventData.eventData;
            const client = eventData.eventClientId;
            const isServer = eventData.isServer;

            if (isServer) {
                logger.debug("Recieved server event: ", name);

                serverIOEmitter.emit(name, data, client);
            } else {
                let socketClient = SocketClient.getClient(client);
                if (!socketClient) return;
                socketClient._sendEvent(name, data);
            }
        });

        let ioEvents = {};

        serverIOEmitter.on("new-user", (data, clientId) => {
            logger.debug("A new client has connected - id:", clientId);
            let client = new SocketClient(hostSocket, clientId);
            socketConnectionEmitter.emit("connection", client);
        });

        serverIOEmitter.on("delete-user", (data, clientId) => {
            logger.debug("Client of ID", clientId, "has disconnected.");
            SocketClient.deleteClient(clientId);
        });

        const functionLogger = require("../../console/logger").create("capsulator.server.worker");
        (new Function(`with(this) {${serverFunction}}`)).call({
            logger: functionLogger,
            console: functionLogger,
            http: app,
            io: socketConnectionEmitter,/*
            require: path => {
                let isRelative = false;
                isRelative = (/^(([a-z]:[\\/])|(\.{0,2}[\\/]))/gmi).test(path);
            }*/
            require: require
        });
    });
}

process.on("message", message => {
    let cmd = message.type, data = message.data;

    switch (cmd) {
        case "INFO":
            initalise(data.port, data.serverFunction, data.hostId);
            break;
        case "SET_NAME":
            setNameTo(data.name);
            break;
    }
});