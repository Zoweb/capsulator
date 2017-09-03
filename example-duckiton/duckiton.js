const capsulator = require("../")();

const log = capsulator.logger.create("capsulator.test.duckiton");
log.verbosity.setVerbosity(log.verbosity.level.INFO);

log.log("Capsulator manual tester.");
log.log("This app runs a basic server on Capsulator and tests socket/http proxies.");
log.log("Accessing `http://localhost:8080` will open a website that allows a user to test socket and http settings.\n\n");

capsulator.serverRunner.setNewServerFn((http, io) => {
    log.info("Server is running");

    http.use("/", (req, res) => {
        res.end(`<h1>Hello, User.</h1>
<h2>You're visiting: ${req.url}</h2>
<script src="/socket.io/socket.io.js"></script>
<script>const socket = io();
socket.on("test event", data => {
    console.log("We received an event! It's value is", data);
    socket.emit("response");
});
</script>`);
    });

    io.on("connection", socket => {
        log.info("***** NEW SOCKET CONNECTION");
        socket.emit("test event", "blabla");
        socket.on("response", () => log.log("YAY!!!!!"));
    });
});

capsulator.serverRunner.load.all().then(() => {
    capsulator.serverRunner.load.init(8000);
});