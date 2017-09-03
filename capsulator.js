/**!
 * (c) zoweb 2017
 * Licenced under the MIT licence
 */

module.exports = function() {
    const app = require("express")();
    const Http = require("http"), http = Http.Server(app);
    const io = require("socket.io")(http);

    const culinary = require("culinary");
    const verbosity = require("./lib/console/verbosity.js"); verbosity.setVerbosity("debug");
    const logger = require("./lib/console/logger");
    const log = logger.create("capsulator.main");

    const serverRunner = require("./lib/server/server-runner");
    const config = require("./lib/config.js");

    log.info("Capsulator reserves ports between", config.portRange.join(" and ") + ".", "Please do not use these ports," +
        "as that might break the server. You can configure these ports by setting the `capsulator.portRange` option.\n\n");

    process.on("exit", () => {
        log.severe("Capsulator has exited. To prevent downtime, restart Capsulator.");

        /*culinary.save();
        culinary.eraseLine().position(5, culinary.dimensions().height - 4).write(culinary.style("WARNING!").spice("red", "bgWhite") +
            culinary.style(" Capsulator is currently not running! " +
                "No user can connect to your servers! To prevent downtime, restart Capsulator using the command below:\n").spice("black", "bgWhite") +
            culinary.style("    $").spice("red") + culinary.style(" node").spice("green") + culinary.style(" ./").spice("yellow"));
        culinary.restore();*/
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
        }
    };
};