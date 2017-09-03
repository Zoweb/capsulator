/**!
 * (c) zoweb 2017
 * Licenced under the MIT licence
 */

const newLogger = require("./new/logger-class");
module.exports = {
    create(name) {
        return new newLogger(process.stdout, name);
    }
};
return;

const create = function(name) {
    const verbosity = require("./verbosity");
    const write     = require("./write-log");
    const culinary  = require("culinary");

    return {
        verbosity: verbosity,
        setTitle: newTitle => name = newTitle,
        create: create,

        severe: (...messages) => write.array("severe", name, messages),
        error:  (...messages) => write.array("error",  name, messages),
        warn:   (...messages) => write.array("warn",   name, messages),
        log:    (...messages) => write.array("log",    name, messages),
        info:   (...messages) => write.array("info",   name, messages),
        debug:  (...messages) => write.array("debug",  name, messages),

        clear: () => culinary.position(0, 0).clearScreen()
    }
};

module.exports = create("capsulator");