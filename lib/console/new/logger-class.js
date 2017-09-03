const verbosity = require("./verbosity");
const Writer = require("./writer-class");

/**
 * Logs text to a stream
 *
 * @class
 */
class Logger {
    /**
     * Creates a new instance of the Logger
     * @param {Stream} [stream=process.stdout] - The stream to log to
     * @param {?string} [name=null] - The logger's name. Helpful for differentiating loggers.
     */
    constructor(stream = process.stdout, name = null) {
        if (typeof stream.write !== "function") throw new TypeError("Stream must be writeable (i.e. have `write` method)");

        this.verbosity = verbosity;
        this.name = name;

        this._writer = new Writer(stream);
    }

    /**
     * Logs a severe error
     * @param {...string} messages - The messages to log
     */
    severe(...messages) {
        this._writer.prettyWrite("severe", this.name, ...messages);
    }

    /**
     * Logs a non-severe error
     * @param {...string} messages - The messages to log
     */
    error(...messages) {
        this._writer.prettyWrite("error", this.name, ...messages);
    }

    /**
     * Logs a warning
     * @param {...string} messages - The messages to log
     */
    warn(...messages) {
        this._writer.prettyWrite("warn", this.name, ...messages);
    }

    /**
     * Logs some info
     * @param {...string} messages - The messages to log
     */
    info(...messages) {
        this._writer.prettyWrite("info", this.name, ...messages);
    }

    /**
     * Debugs some info
     * @param {...string} messages - The messages to log
     */
    debug(...messages) {
        this._writer.prettyWrite("debug", this.name, ...messages);
    }


    log() {
        this.warn("Logger->log is deprecated. @", new Error().stack.split("\n")[2].substr("    at ".length));
    }
}

module.exports = Logger;