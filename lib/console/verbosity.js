/* Verbosity levels */

module.exports = require("./new/verbosity");
return;

let verbosityLevels = ["severe", "error", "warn", "log", "info", "debug"],
    verbosity = 4;

const stringAsLevel = function(level) {
    if (typeof level === "number") {
        if (level < 0 || level > verbosityLevels.length) throw new RangeError("Level must be between 0 and " +
            verbosityLevels.length);
        return level;
    }
    if (typeof level !== "string") throw new TypeError("Invalid level type");

    return verbosityLevels.indexOf(level);
};

const levelAsString = function(level) {
    if (typeof level === "string") {
        if (verbosityLevels.indexOf(level) > -1) return level;
        throw new RangeError("Invalid level");
    }
    if (typeof level !== "number") throw new TypeError("Invalid level type");
    if (level < 0 || level > verbosityLevels.length)
        throw new RangeError("Level must be between 0 and " + verbosityLevels.length);

    return verbosityLevels[level];
};

const setVerbosity = function(level) {
    verbosity = stringAsLevel(level);
};

const useLevel = level => verbosity >= stringAsLevel(level);

module.exports = {
    stringAsLevel: stringAsLevel,
    levelAsString: levelAsString,
    setVerbosity: setVerbosity,
    useLevel: useLevel,

    get verbosity() {return verbosity},

    level: {
        get SEVERE() {return stringAsLevel("severe")},
        get ERROR()  {return stringAsLevel("error")},
        get WARN()  {return stringAsLevel("warn")},
        get LOG()  {return stringAsLevel("log")},
        get INFO()  {return stringAsLevel("info")},
        get DEBUG()  {return stringAsLevel("debug")}
    }
};