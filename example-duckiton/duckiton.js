const capsulator = require("../")();

const logger = capsulator.logger.create("capsulator.test.duckiton");
logger.verbosity.setVerbosity(logger.verbosity.level.INFO);

logger.info("Duckiton Game.");
logger.log("Based on Bingiton.");
logger.log("Made using Capsulator for multi-server redundancy.\n\n");

// This runs on another thread so it has a different scope (containing http and io as values)
// However as it is on another thread, we can't call functions from the main thread.
// You can still do require(), however it will do it relative to the worker's path.
//
// `console` and `logger` both log to the console. However, it is recommended to use them
// sparingly as there is usually two of the below functions running at once, so things can get
// a bit messed up.
capsulator.serverRunner.setNewServerFn(() => {
    logger.info("Server is running");

    http.use("/", (req, res) => {

    });

    io.on("connection", socket => {
        logger.info("***** NEW SOCKET CONNECTION");
        socket.emit("test event", "blabla");
        socket.on("response", () => logger.log("YAY!!!!!"));
    });
});

capsulator.serverRunner.load.all().then(() => {
    capsulator.serverRunner.load.init(8000);
});