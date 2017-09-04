/* Stores, creates and removes clients from the running list */

const crypto = require("crypto");
const GLOBAL_CONFIG = require("../../config");

const clients = {};

/**
 * Generates a client id
 */
const generateId = function() {
    // 50 bytes of client ids = ~ 2.6 * 10^120 (over a googol)
    let id = crypto.randomBytes(50).toString("hex");
    if (clients[id]) return generateId();
    return id;
};

/**
 * Stores all client information. Mostly just used for "instanceof" detection.
 */
class Client {
    constructor(socket) {
        let id = generateId();

        this.id = () => id;
        this.remove = () => delete clients[id];

        this._internal = {};
        this._internal.emit = (event, data) => socket.emit(event, data);
    }
}

/**
 * Creates a client
 * @param socket The client's socket.io connection
 */
const create = function(socket) {
    return new Client(socket);
};

/**
 * Adds a client to the list
 * @param client The client to add
 */
const add = function(client) {
    if (!(client instanceof Client)) throw new TypeError("`client` must be an instance of `Client`");
    clients[client.id()] = client;

    GLOBAL_CONFIG.totalConnections++;
};

/**
 * Gets every client
 * @returns {Client[]}
 */
const getAll = function() {
    let clientsArray = [];
    for (let client in clients) {
        if (!clients.hasOwnProperty(client)) continue;
        clientsArray.push(client);
    }
    return clientsArray;
};

/**
 * Gets a client from an ID
 * @param [id] The client's ID
 * @returns {Client | {all: Function}}
 */
const get = function(id) {
    if (typeof id === "undefined") return {all: getAll};

    return clients[id];
};

module.exports = {
    create: create,
    add: add,
    get: get
};