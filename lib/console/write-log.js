/* Writes to the console [as a log] */

const verbosity = require("./verbosity");

const write = function(level, logTitle, ...messages) {
    // check if the verbosity level is high enough to send this message
    if (!verbosity.useLevel(level)) return;
    level = verbosity.levelAsString(level);

    if (typeof logTitle === "string" && logTitle.length > 0)
        messages.unshift(`[${logTitle}]`);
    messages.unshift(`[${level}]`);
    messages.unshift(new Date().toLocaleTimeString());

    // Parse objects
    messages = messages.map(text =>
        typeof text === "object" ? JSON.stringify(text) :
            typeof text === "undefined" ? "undefined" : text
    );

    console.log(messages.join(" "));
};

write.array = function(level, logTitle, messagesArray) {
    arguments = messagesArray;
    arguments.unshift(logTitle);
    arguments.unshift(level);
    write(...arguments);
};

module.exports = write;