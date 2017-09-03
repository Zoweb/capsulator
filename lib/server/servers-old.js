/* Functions to do with the servers */

const GLOBAL_CONFIG = require("../config.js");

const debug = require("../console/debug")();
debug.setTitle("host");

const clients = require("./socket/clients.js");
const proxyEvent = require("./socket/proxy-events");

let ServerRunner = require("./http/server-runner");

const hostHttp = require("./http/app");
const hostSocket = require("socket.io")(hostHttp.http.server);

const ioClient = require("socket.io-client");

let CURRENT_SERVER = {
    server: null,
    socket: null,
    port: 0,
    isRunning: false
},  BACKUP_SERVER = {
    server: null,
    socket: null,
    port: 0,
    isRunning: false
};

const getServerCommands = function(servers) {
    const send = (event, data, client) => {
        servers.forEach((server) => {
            server.socket.emit("event " + GLOBAL_CONFIG.hostId, {
                eventName: event,
                eventData: data,
                eventClientId: client.id
            });
        });
    };

    const init = () => {
        send("host id", GLOBAL_CONFIG.hostId);
    };

    const sendPerson = (client) => {
        send("new user " + GLOBAL_CONFIG.hostId, client.id());
    };
    const sendAllPeople = () => {
        debug("Sending all currently logged in users to the specified servers...");
        clients.get().all().forEach(sendPerson);
    };
    const removePerson = (client) => {
        send("delete user " + GLOBAL_CONFIG.hostId, client.id());
    };

    const getSocket = () => ({
        send: send,
        sendPerson: sendPerson,
        sendAllPeople: sendAllPeople,
        removePerson: removePerson
    });


    const sendStopMessage = () => {
        send("stop server " + GLOBAL_CONFIG.hostId);
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
        raw: getRawServers
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

const connectToSocketServer = function(port, server = "localhost") {
    return ioClient.connect(`http://${server}:${port}`);
};

const eventAsPromise = function(event, name, otherPromise) {
    let wasOtherPromise = true;
    if (!(otherPromise instanceof Promise)) {
        otherPromise = Promise.resolve();
        wasOtherPromise = false;
    }

    return new Promise((yay, nay) => {
        otherPromise.then(() => {
            debug("was waiting for otherPromise: " + wasOtherPromise);
            event.on(name, (data) => {
                yay(data);
            });
        });
    });
};



const loadNewServers = function(mainServerLocation = "localhost", backupServerLocation = "localhost") {
    ServerRunner = GLOBAL_CONFIG.updateRequire("./server/http/server-runner");

    debug("Starting a new main and backup server.");

    let mainServer = new ServerRunner(instantServerSwitch), mainSocket;
    mainServer.setName("server");

    let mainServerReady = eventAsPromise(mainServer, "ready"),
        mainSocketReady = new Promise((yay, nay) => {
            mainServerReady.then((data) => {
                debug(`Connecting to main socket (port ${data})...`);
                mainSocket = connectToSocketServer(data.port, mainServerLocation);
                eventAsPromise(mainSocket, "connect").then(yay);
            });
        });

    mainServerReady.then(() => {
        debug("done!!!");
    });

    Promise.all([mainServerReady, mainSocketReady]).then(data => {
        const serverPort = data[0];

        debug("Main server is ready.");

        if (getCurrent().server().isRunning()) {
            getCurrent().server().sendStopMessage();
        }

        hostHttp.express.setPort(serverPort);

        CURRENT_SERVER = {
            server: mainServer,
            socket: mainSocket,
            port: serverPort,
            isRunning: true
        };

        getCurrent().socket().sendAllPeople();
        proxyEvent.loadSocketProxyEvent(mainSocket);
    });

    /*let backupServer = new ServerRunner(instantServerSwitch), backupSocket = connectToSocketServer(backupServer, backupServerLocation);
    backupServer.setName("backup server");

    let backupServerReady = eventAsPromise(backupServer, "ready"), backupSocketReady = eventAsPromise(backupSocket, "connect", backupServerReady);

    Promise.all([backupServerReady, backupSocketReady]).then(data => {
        const port = data[0];

        debug("Backup server is ready.");

        if (getBackup().server().isRunning()) {
            getBackup().server().sendStopMessage();
        }

        BACKUP_SERVER = {
            server: backupServer,
            socket: backupSocket,
            port: port,
            isRunning: true
        };

        getBackup().socket().sendAllPeople();
        proxyEvent.loadSocketProxyEvent(backupSocket);
    });

    return Promise.all([
        mainServerReady, mainSocketReady,
        backupServerReady, backupSocketReady
    ]);*/
    return Promise.all([mainServerReady, mainSocketReady]);
};

const instantServerSwitch = function(doStop, backupServerLocation = "localhost") {
    debug("Switching backup to main server and starting a new backup server.");

    getCurrent().raw()[0].setName("previous server");
    if (doStop) {
        getCurrent().server().sendStopMessage();
    }

    CURRENT_SERVER = BACKUP_SERVER;
    CURRENT_SERVER.setName("server");

    hostHttp.express.setPort(getCurrent().raw()[0].port);

    // but, we can't handle constant crashes - we have to wait for each server to start up before we can crash again
    let backupServer = new ServerRunner(instantServerSwitch), backupSocket = connectToSocketServer(backupServer, backupServerLocation);
    backupServer.setName("backup server");

    let backupServerReady = eventAsPromise(backupServer, "ready"), backupSocketReady = eventAsPromise(backupSocket, "connect");

    return Promise.all([backupServerReady, backupSocketReady]).then(serverPort => {
        debug("Backup server is ready.");

        if (getBackup().server().isRunning()) {
            getBackup().server().sendStopMessage();
        }

        BACKUP_SERVER = {
            server: backupServer,
            socket: backupSocket,
            port: serverPort,
            isRunning: true
        };

        getBackup().socket().sendAllPeople();
        proxyEvent.loadSocketProxyEvent(backupSocket);
    });
};

const initialiseConnectability = function(port) {
    debug("Initialising...");

    if (!port) port = 8000;

    if (typeof port !== "number") {
        throw new TypeError("port must be a number");
    }
    if (port < 1 || port > 65535) {
        throw new TypeError("port must be over 0 and under 65536");
    }

    const httpProxy = hostHttp.express.listen(port, getCurrent().raw()[0].port);
    proxyEvent.loadHostProxyEvent(hostSocket);
};

module.exports = {
    all: getAll,
    current: getCurrent,
    backup: getBackup,
    load: {
        all: loadNewServers,
        instant: instantServerSwitch,
        init: initialiseConnectability
    }
};