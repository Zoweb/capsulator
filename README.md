NodeJS Capsulator
=================

Run an online multiplayer game? Or another type of server that you never
want to go down? _Capsulator_ is for you! It runs multiple copies of
your site, so that if one breaks, it can instantly switch to a new
version. It uses Node's "clusters" to run your code on another process,
so that if it crashes nothing else is effected.

How do you use it?
------------------

### Installation

Install capsulator in your project by running:

```bash
$ npm i --save capsulator
```

### API

Here's a small example:

First we need to load a new Capsulator instance:
`const capsulator = require("capsulator")();`

We'll also load capsulator's logger so that we can say stuff.
`const logger = capsulator.logger.create("capsulator.example");`

Now we can set capsulator's verbosity, i.e. we can say what types of
messages get logged.
`logger.verbosity.setVerbosity(logger.verbosity.level.INFO);`

#### The Logger

##### Verbosity

Using this `setVerbosity` method, we can tell capsulator what we want
it to tell us. For example, setting it to `logger.verbosity.level.INFO`
will tell it to only tell us anything with a verbosity level of "info"
or above, i.e.

 - Info
 - Warn
 - Error
 - Severe

If we were to set it to `logger.verbosity.level.DEBUG` (the lowest
level) it would log everything:

 - Debug
 - Info
 - Warn
 - Error
 - Severe

The lowest level you can set it to is `logger.verbosity.level.SEVERE`,
which will only log severe messages.

##### Methods

Now we'll log some basic info about the server, for example:

```js
logger.info("Capsulator example.");
logger.info("This app runs a basic server on Capsulator and tests socket/http proxies.");
logger.info("Accessing `http://localhost:8080` will open a website that allows a user to test socket and http settings.\n\n");
```

You'll notice that there is a `logger.xxx` function for each verbosity
level. These will log with different colours and titles to the console.

For example, running `logger.info("hi", "there")` will display something
like:

```
10:39:00 AM [capsulator.example] info: hi there
```

in the console.

---

Now we will get to the main bit: defining "what will the server _do_"?

#### The Main Bit

To do this we use the `capsulator.serverRunner.setNewServerFn()` method.
This sets the function that runs to create a new server. To create a
simple webpage, we'd say:

```js
capsulator.serverRunner.setNewServerFn(() => {
    logger.info("Server is running");

    http.use("/", (req, res) => {
        res.end(`<h1>Hello, User.</h1>
<h2>You're visiting: ${req.url}</h2>
<script src="/socket.io/socket.io.js"></script>
<script>const socket = io();
socket.on("test event", data => {
    console.info("We received an event! It's value is", data);
    socket.emit("response");
});
</script>`);
    });

    io.on("connection", socket => {
        logger.info("*** NEW SOCKET CONNECTION");
        socket.emit("test event");
    });
});
```

##### Scope

You'll notice that we haven't defined `http` or `io`. That is true. This
is because this runs on another thread, so it has a different scope
(containing `http` and `io` as values). However, as it is on another
thread, we can't call functions from the main thread. This means that
`require()` will have to be used. However, `require()` will be relative
to the thread's file. This means that when you're including local JS
files, you'll need to add some `../`'s to the path:

For example, if capsulator is located in `./node_modules/capsulator`,
and the script is located in `./lib/myScript.js`, you'd need to do
`require("../../../../../lib/myScript")` to include it.

You should still be able to require other modules properly, though.

Note that `console` and `logger` are also part of the scope (and are
overrided). Both of these will prettily log to the console. However, it
is recommended to use these sparingly, as there is usually two copies of
the server function running at once, so things can get a bit messed up.

So, this wouldn't work:

```js
const myVariable = 10;
capsulator.serverRunner.setNewServerFn(() => {
    console.info(myVariable); // TypeError: myVariable isn't defined
});
```

Instead you'd need to do this:
```js
/*** data.js ***/
module.exports = {
    myVariable: 10
};

/*** index.js ***/
capsulator.serverRunner.setNewServerFn(() => {
    console.info(require("../../../../../data").myVariable);
});
```

---

#### Starting up the server

Now we need to actually start the server up. This can be very simply
done with the below code:

```js
capsulator.serverRunner.load.all().then(() => {
    capsulator.serverRunner.load.init(8000);
});
```

This will load the servers, then initialise Capsulator to use port 8000.

##### Warnings about ports

Behind the main server, there are multiple other servers. These each
require ports. These ports are chosen from between
`capsulator.portRange[0]` and `capsulator.portRange[1]`. Make sure these
ports are available, otherwise things could break!

How It Works
------------

Capsulator's backend uses two Express servers that are each running on a
different thread. Each of these servers runs on a port picked between
the two values in `capsulator.portRange`. The servers start up and run
an Express and Socket.io server on their chosen ports.

The main server runs on the port specified as the first argument in
`capsulator.serverRunner.load.init()`. It then acts as a proxy to the
other two servers. This sounds simple, but oh it isn't.

For initial communication between the main thread and the children,
process messaging is used, as there is no socket to connect to. This
tells the children what port they should use, as well as the function
they should run. However, messages must be sent as text, so the
functions have to be converted to strings before they're sent and back
to a function after. This removes their scope, so a custom one is added.

Once the servers have started up, the main server connects to their
socket. Whenever someone connects to the main socket, it does some magic
so that each of the children sockets can send information to that person
but to no-one else (kinda like IPs!). It does this by giving each user a
random ID. Every request then contains this ID so that the main server
knows who to send the request to.

The server also sends "SERVER" messages, using the a randomly generated
ID to make sure that others cannot tap into these messages. These
"SERVER" messages can do multiple things, including adding and removing
users, and shutting down the server.