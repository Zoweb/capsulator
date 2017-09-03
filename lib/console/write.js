/* Writes to the console */

const culinary = require("culinary");
const verbosity = require("./verbosity");

const write = function(level, logTitle, ...messages) {
    // check if the verbosity level is high enough to send this message
    if (!verbosity.useLevel(level)) return;
    level = verbosity.levelAsString(level);

    // set the title of the command line to the message
    process.title = messages.join(" ").replace(/[\n\r]/g, " | ") + " - capsulator";

    culinary.back(culinary.dimensions().width).eraseLine().up(1);

    if (typeof logTitle === "string" && logTitle.length > 0)
        messages.unshift(culinary.style(`[${logTitle}]`).spice("yellow"));
    messages.unshift(culinary.style(`[${level}]`).spice("red"));
    messages.unshift(culinary.style(new Date().toLocaleTimeString()).spice("green"));

    // check for enters - we only need to bother with some calculations if it has them
    let messageHasEnters = messages.some((text) => {
        if (typeof text !== "string") return;
        if (text.indexOf("\n") > -1) return true;
    });

    if (messageHasEnters) messages.unshift(culinary.style(" |=> ").spice("bgBlue"));
    else messages.unshift(culinary.style(" ==> ").spice("bgBlue"));

    // Add some padding
    messages.unshift("      ");

    // Parse objects
    messages = messages.map(text =>
        typeof text === "object" ? JSON.stringify(text) :
        typeof text === "undefined" ? "undefined" : text
    );

    // Add spacing on new lines
    if (messageHasEnters) messages = messages.map(text =>
        text.split(/[\n\r]/).join("\n        | . . . . . . . . . . . . . . . . . . . . " + culinary.style(" ==> ").spice("bgBlue") + " ")
    );

    // Remove any user inputs
    culinary.eraseLine("entire");

    // Write the messages
    culinary.write(messages.join(" "));

    // Write the user-input line
    culinary.write("\n\n            > ");
};

write.array = function(level, logTitle, messagesArray) {
    arguments = messagesArray;
    arguments.unshift(logTitle);
    arguments.unshift(level);
    write.apply(this, arguments);
};

module.exports = write;