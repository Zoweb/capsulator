/* Functions to do with the servers */

const GLOBAL_CONFIG = require("../config");

const log = require("../console/logger").create("server.server-runner");

const clients = require("./socket/clients");
const proxyEvent = require("./socket/proxy-events");

let ServerRunner = require("./http/server-runner");

const hostHttp = require("./http/app");
const hostSocket = require("socket.io")(hostHttp.http.server);

const ioClient = require("socket.io-client");

const promback = require("../etc/fn-to-promise");

let CURRENT_SERVER = {
    server: null,
    socket: null,
    port: 0,
    isRunning: false,
    isMainServer: true
}, BACKUP_SERVER = {
    server: null,
    socket: null,
    port: 0,
    isRunning: false,
    isMainServer: false
};

let serverFunction = function(){};

const getServerCommands = function(servers) {
    const send = (event, data, clientId, isServer) => {
        log.debug("Sending `", event, "` with data `", data, "` to client `", clientId, "`. Server port(s) is/are ", servers.map(server => server.port).join(", ") ,". Is this a server event?", isServer ? "yes" : "no");
        servers.forEach((server) => {
            server.socket.emit("event " + GLOBAL_CONFIG.hostId, {
                eventName: event,
                eventData: data,
                eventClientId: clientId,
                isServer: !!isServer
            });
        });
    };

    const sendPerson = (client) => {
        log.debug("Sending user " + client.id() + " to server...");
        send("new-user", {}, client.id(), true);
    };
    const sendAllPeople = () => {
        log.debug("Sending all currently logged in users to the specified servers...");
        clients.get().all().map(person => clients.get(person)).forEach(sendPerson);
    };
    const removePerson = (client) => {
        send("delete-user", {}, client.id(), true);
    };

    const killProcess = () => {
        log.debug("Killing servers");
        send("end-process", {}, 0, true);
    };


    const sendEvent = (name, data) => {
        send("inner-event", {
            name: name,
            data: data
        }, 0, true);
    };

    const listenForEvent = (name, callback) => {
        servers.forEach(server => {
            if (!server.isRunning) throw new ReferenceError("Server isn't running yet!");

            server.server._addUserEvent(name, callback);
        });
    };

    const getSocket = () => ({
        send: send,
        sendPerson: sendPerson,
        sendAllPeople: sendAllPeople,
        removePerson: removePerson,
        rawParent: servers
    });


    const sendStopMessage = () => {
        send("stop-server", null, null, true);
    };

    const isRunning = () => {
        servers.every((server) => {
            return server.isRunning;
        });
    };

    const getServer = () => ({
        sendStopMessage: sendStopMessage,
        isRunning: isRunning,
        asServerRunner: servers
    });

    const getRawServers = () => servers;


    return {
        socket: getSocket,
        server: getServer,
        raw: getRawServers,
        emit: sendEvent,
        on: listenForEvent,
        kill: killProcess
    };
};

const getAll = function() {
    return getServerCommands([
        CURRENT_SERVER,
        BACKUP_SERVER
    ]);
};
const getCurrent = function() {
    return getServerCommands([CURRENT_SERVER]);
};
const getBackup = function() {
    return getServerCommands([BACKUP_SERVER]);
};
const getCustom = function(server, socket) {
    return getServerCommands([{server:server, socket:socket}]);
};

const connectToSocketServer = function(server = "localhost", port) {
    return ioClient.connect(`http://${server}:${port}`);
};

let CURRENT_MAIN_SERVER_PORT = 0;
const loadServer = async function(getServerFn, serverName) {
    ServerRunner = GLOBAL_CONFIG.updateRequire("./server/http/server-runner");

    log.info(`Starting ${serverName} server...`);

    const server = ServerRunner(serverFunction, module.exports.onCrash, GLOBAL_CONFIG.serverData);

    const port = await promback(server.on.bind(server))("ready").catch(err => {
        log.severe(err.message);
    });

    server.setName("server." + serverName);

    log.debug("Connecting to socket server with port", port, "...");

    const socket = connectToSocketServer("localhost", port);

    await promback(socket.on.bind(socket))("connect").catch(err => {
        log.severe(err.message);
    });

    log.debug(`Connected to ${serverName} socket`);

    if (getServerFn().server().isRunning()) {
        getServerFn().server().sendStopMessage();
    }

    const object = {
        server: server,
        socket: socket,
        port: port,
        isRunning: true
    };

    log.debug(`Loading ${serverName} socket proxy...`);
    proxyEvent.loadSocketProxyEvent(socket, emit => {
        if (CURRENT_MAIN_SERVER_PORT === object.port) emit();
        else log.debug("Blocked event getting sent, as this server's port is", object.port, "but the main server port is", CURRENT_MAIN_SERVER_PORT);
    });

    log.info(`${serverName[0].toUpperCase() + serverName.substr(1)} server is ready.`);

    return object;
};

const loadNewServers = async function() {

    const mainServer = loadServer(getCurrent, "main");
    const backupServer = loadServer(getBackup, "backup");

    mainServer.then(server => {
        hostHttp.express.setPort(server.port);

        CURRENT_SERVER = server;
        CURRENT_MAIN_SERVER_PORT = server.port;
        hostHttp.setPort(CURRENT_MAIN_SERVER_PORT);
        proxyEvent.setCurrentSocketFunctions(getCurrent().socket(), getAll().socket());

        module.exports.onNewMainServer.forEach(listener => listener());

        getCurrent().socket().sendAllPeople();
    });

    backupServer.then(server => {
        BACKUP_SERVER = server;

        getBackup().socket().sendAllPeople();
    });

    await Promise.all([mainServer, backupServer]).catch(err => {
        log.severe(err.message);
    });

    log.info("Finished loading servers.");
};

const instantServerSwitch = async function(doStop, backupServerLocation = "localhost") {
    log.info("Switching backup to main server and starting a new backup server...");

    getCurrent().raw()[0].setName("previous server");
    if (doStop) {
        getCurrent().server().sendStopMessage();
    }

    CURRENT_MAIN_SERVER_PORT = BACKUP_SERVER.port;
    CURRENT_SERVER = BACKUP_SERVER;
    proxyEvent.setCurrentSocketFunctions(getCurrent().socket(), getAll().socket());
    CURRENT_SERVER.setName("current server");

    module.exports.onNewMainServer.forEach(listener => listener());

    hostHttp.express.setPort(getCurrent().raw()[0].port);

    // but, we can't handle constant crashes - we have to wait for each server to start up before we can crash again
    const backupServer = loadServer(getBackup, "backup");

    await backupServer;

    BACKUP_SERVER = backupServer;
    getBackup().socket().sendAllPeople();
};

let port = 3000;
const initialiseConnectivity = function() {
    if (typeof port !== "number") throw new TypeError("Argument `port` must be of type Number");
    if (Math.round(port) !== port) throw new TypeError("Argument `port` must be an integer");
    if (port < 1 || port > 65535) throw new RangeError("Argument `port` must be between 1 and 65535 inclusive");

    log.debug("Initialising on port", port);

    hostHttp.express.loadProxy(port, getCurrent().raw()[0].port);
    proxyEvent.loadHostProxyEvent(hostSocket, getAll().socket(), getCurrent().socket());
};

const setNewServerFn = function(fn) {
    if (typeof fn !== "function") throw new TypeError("Argument `fn` must be of type Function");

    log.debug("Set server function to `"+ (fn.name || fn.toString().replace(/[\n\r]/g, "").replace(/ {2,}/g, " ").substr(0, 20) + "...") + "`. Changes will update on loading" +
        " a new server");

    serverFunction = fn;
};

const loadNewServer = async function(fn) {
    let previousServerFn = serverFunction;

    serverFunction = fn;

    await loadNewServers();

    serverFunction = previousServerFn;
};

module.exports = {
    all: getAll,
    current: getCurrent,
    backup: getBackup,
    setNewServerFn: setNewServerFn,
    onCrash: () => {
        console.warn("It looks like a server crashed! We will instantly switch to a new server, but remember that there's still an error that you might want to fix!");
        instantServerSwitch();
    },
    load: {
        all: loadNewServers,
        instant: instantServerSwitch,
        init: initialiseConnectivity,
        different: loadNewServer
    },
    port(val) {
        port = val;
    },
    onNewMainServer: []
};