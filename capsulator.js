/**!
 * (c) zoweb 2017
 * Licenced under the MIT licence
 */

module.exports = function() {
    const verbosity = require("./lib/console/verbosity.js"); verbosity.setVerbosity("debug");
    const logger = require("./lib/console/logger");
    const log = logger.create("capsulator.main");

    const serverRunner = require("./lib/server/server-runner");
    const config = require("./lib/config.js");

    log.info("Capsulator reserves ports between", config.portRange.join(" and ") + ".", "Please do not use these ports," +
        "as that might break the server. You can configure these ports by setting the `capsulator.portRange` option.\n\n");

    process.on("exit", () => {
        log.severe("Capsulator has exited. To prevent downtime, restart Capsulator.");
    });


    return {
        setVerbosity: verbosity.setVerbosity,
        serverRunner: serverRunner,
        logger: logger,

        set portRange(value) {
            if (value.length !== 2) throw new TypeError("Port range must be in the form [min, max]");
            if (value[1] - value[0] < 10) throw new TypeError("Ports must be at least 10 from each other.");

            config.portRange = value;
        },
        get portRange() {
            return [].slice.call(config.portRange);
        },

        get connectionsSinceOpen() {
            return config.totalConnections;
        },

        get constants() {
            return config.serverData;
        },
        set constants(value) {
            config.serverData = value;
        }
    };
};