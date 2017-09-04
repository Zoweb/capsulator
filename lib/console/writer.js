const verbosity = require("./verbosity");
const util = require("util");

const colors = {
    reset : "\033[0m",
    hicolor : "\033[1m",
    underline : "\033[4m",
    inverse : "\033[7m",
    // foreground colors
    black : "\033[30m",
    red : "\033[31m",
    green : "\033[32m",
    yellow : "\033[33m",
    blue : "\033[34m",
    magenta : "\033[35m",
    cyan : "\033[36m",
    white : "\033[37m",
    // background colors
    bg_black : "\033[40m",
    bg_red : "\033[41m",
    bg_green : "\033[42m",
    bg_yellow : "\033[43m",
    bg_blue : "\033[44m",
    bg_magenta : "\033[45m",
    bg_cyan : "\033[46m",
    bg_white : "\033[47m"
};

/**
 * Writes to the console
 *
 * @class
 */
class Writer {
    /**
     * Creates a new writer
     * @param {Stream} stream - The stream to log to
     */
    constructor(stream) {
        this._stream = stream;
    }

    /**
     * Writes a line to the stream
     * @param {...string} text - The text to write
     */
    writeLine(...text) {
        this.write(...text);
        this.write("\n");
    }

    /**
     * Writes text to the stream
     * @param {...string} text - The text to write
     */
    write(...text) {
        this._stream.write(util.format(...text));
    }

    /**
     * Prettily writes text to a stream. Uses different verbosity levels.
     * Messages will only be written if the verbosity level is high enough
     * @param {string|number} level - The verbosity to log with
     * @param {string} name - The name of the logger. Set to anything other than a string to disable
     * @param {...string} messages - The text to write
     */
    prettyWrite(level, name, ...messages) {
        // check if the verbosity level is high enough to send this message
        if (!verbosity.useLevel(level)) return;

        if (typeof name === "string" && name.length > 0) messages.unshift(`${verbosity.getColor(level)}${verbosity.levelAsString(level)}:${colors.reset}`);
        messages.unshift(`[${colors.bg_white}${colors.black}${name}${colors.reset}]`);
        messages.unshift(new Date().toLocaleTimeString());

        // parse objects
        messages = messages.map(text =>
            typeof text === "object" ? JSON.stringify(text) :
                typeof text === "undefined" ? "undefined" : text);

        this.writeLine(...messages);
    }
}

module.exports = Writer;