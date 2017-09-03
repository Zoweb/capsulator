/* Verbosity levels */

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

let verbosityLevels = ["severe", "error", "warn", "info", "debug"],
    verbosityColors = [colors.bg_red + colors.white, colors.red, colors.yellow, colors.green, colors.cyan],
    verbosity = 3;


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

const getColor = function(level) {
    return verbosityColors[stringAsLevel(level)];
};

module.exports = {
    stringAsLevel: stringAsLevel,
    levelAsString: levelAsString,
    setVerbosity: setVerbosity,
    useLevel: useLevel,
    getColor: getColor,

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