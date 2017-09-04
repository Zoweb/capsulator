/* Loads proxy events, opening the wildcard listeners */

const log = require("../../console/logger").create("server.proxy-events");
const clients = require("./clients");

/**
 * Adds a wildcard to any socket.io events
 * @param socket The socket.io client
 * @returns {function} socket.onevent
 */
const addWildcard = function(socket) {
    const socketOriginalOnEvent = socket.onevent;
    return function onevent(packet) {
        let args = packet.data || [];
        socketOriginalOnEvent.call(this, packet);
        packet.data = ["*"].concat(args);
        socketOriginalOnEvent.call(this, packet);
    };
};

/**
 * Loads the socket proxy event listener for server->client messaging
 * @param socket The socket.io connection
 * @param emitFunction The function to run to emit
 */
const loadSocketProxyEvent = function(socket, emitFunction) {
    socket.onevent = addWildcard(socket);

    socket.on("*", (event, data) => {
        let clientId = data.clientId;
        let emitData = data.emitData;

        log.debug(`SocketPassEvent::serverToClient{client="${clientId}";event="${event}";data="${emitData}"}`);

        let client = clients.get(clientId);
        if (!client) return;
        let _internal = client._internal;
        if (!_internal) return;
        let emitter = _internal.emit;
        if (typeof emitter === "function") emitFunction(emitter.bind(_internal, event, emitData));
    });
};

let currentSocketFunctions, allSocketFunctions;
/**
 * Loads the socket proxy event listener for client->server messaging
 * @param io The socket.io instance
 * @param allSocketFunctions2 The function to get all servers' sockets
 * @param currentSocketFunctions2 The function to get the current server's socket
 */
const loadHostProxyEvent = function(io, allSocketFunctions2, currentSocketFunctions2) {
    currentSocketFunctions = currentSocketFunctions2;
    allSocketFunctions = allSocketFunctions2;

    io.on("connection", (socket) => {
        socket.onevent = addWildcard(socket);

        // Register a new connection, and send it to the currently active server
        let client = clients.create(socket);
        clients.add(client);

        allSocketFunctions.sendPerson(client);

        log.debug(`SocketConnectEvent::connect{client=${client.id()}}`);

        // Register wildcard event
        socket.on("*", function(event, data) {
            currentSocketFunctions.send(event, data, client.id());
            log.debug(`SocketPassEvent::clientToServer{client="${client.id()}";event="${event}";data="${data}"}`);
        });

        // Register disconnect event
        socket.on("disconnect", function() {
            allSocketFunctions.removePerson(client);
            client.remove();
            log.debug(`SocketConnectEvent:disconnect{client=${client.id()}}`);
        });
    });
};

module.exports = {
    loadSocketProxyEvent: loadSocketProxyEvent,
    loadHostProxyEvent: loadHostProxyEvent,
    setCurrentSocketFunctions(currentSocketFunction, allSocketFunction) {
        currentSocketFunctions = currentSocketFunction;
        allSocketFunctions = allSocketFunction;
    }
};