/* Global Configuration */

const crypto = require("crypto");

const updateRequire = function(path) {
    delete require.cache[require.resolve(path)];
    return require(path);
};

let currentPort;

module.exports = {
    hostId: crypto.randomBytes(50).toString("hex"), // a random id generated at run-time, used for all backend requests to servers
    updateRequire: updateRequire,
    portRange: [1000, 2000],
    temp: {},
    totalConnections: 0,

    newPort() {
        currentPort++;
        currentPort %= module.exports.portRange[1] - module.exports.portRange[0];
        currentPort += module.exports.portRange[0];

        return currentPort;
    }
};

currentPort = module.exports.portRange[0] - 1;