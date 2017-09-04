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

```shell
$ npm i --save capsulator
```

(assuming you've got [Node](https://nodejs.org) already installed)

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

There are ways to work around this issue of scope, including setting
constants or using events. These are described in the "constants" and
"events" sections.

So, to sum up: this wouldn't work:

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

Or, preferably, use constants (described below)

But you should probably not be logging anything anyway.

---

#### Starting up the server

Now we need to actually start the server up. This can be very simply
done with the below code:

```js
capsulator.serverRunner.load.all().then(() => {
    capsulator.serverRunner.load.init(8080);
});
```

This will load the servers, then initialise Capsulator to use port 8080.

##### Warnings about ports

Behind the main server, there are multiple other servers. These each
require ports. These ports are chosen from between
`capsulator.portRange[0]` and `capsulator.portRange[1]`. Make sure these
ports are available, otherwise things could break!

---

#### Constants

**Note:** If you are planning on using constants for variables that can
change or for functions, this won't work. See the events system below.

Constants are values that are added to the `constants` variable in the
server function's scope.

Constants are set by setting the value of `capsulator.constants`. For
example, setting this to `5` would mean that the `constants` variable in
the server function's scope would be set to `5`. You can set this to
anything (including objects to store multiple values) so long as it is
serialisable. This means that you cannot send functions through
constants. If you wish to use functions, use events as described below.

---

#### Events

**Note:** If you are planning on using events for constant variables
that won't change throughout a server function's life, you should use
constants as described above.

Because the server function has its own scope, you can't run functions
on the main thread from the server. However, capsulator has a way to fix
this.

Once the server has loaded (**and only once the server has loaded**) you
can use its server<->host events system to give the server data or for
the server to give the host data.

Note that through this event system, you **cannot send functions** as
all data sent through it is serialised (function cannot be serialised,
so they are simply removed) then deserialised on the other end.

Once the server has loaded, you can emit and listen for events. For
example:

```js
capsulator.serverRunner.load.all().then(() => {
    capsulator.serverRunner.load.init(8080);

    // now we'll make a loop that sends an event every second
    let i = 0;
    setInterval(() => {
        // here we send an event to the main server.
        // you can also use `backup()` instead of `current()` to target
        // that server (or all() to target both)

        capsulator.serverRunner.current().emit("change text", i.toString());
    }, 1000);

    // we'll also listen to an event to see the two-way system
    capsulator.serverRunner.current().on("change text response", msg => logger.info(msg));
});
```

In the server function, we can make it send and receive events too:

We'll remove it and change it to:

```js
capsulator.serverRunner.setNewServerFn(() => {
    logger.info("Server is running");

    // we'll make a string called "textToSend" that we can change
    let textToSend = "loading...";
    http.use("/", (req, res) => {
        res.end(textToSend);
    });

    // we don't need io.on("connection") because we're not using sockets
    // however you could use sockets to live update the user's site when
    // an event runs.

    // we'll listen for the "change text" event
    host.on("change text", text => {
        // this will run whenever the host emits the "change text" event
        logger.info("Changing text to", text);
        textToSend = text;

        // then we'll emit an event back to the host
        host.emit("change text response", "it worked");
    });
});
```

And, yes, host is also a part of the custom scope.

#### Important Note

You should not use the events system to do processing on the host
thread. This means that if that code crashes, the system won't be able
to recover and you'll need to manually restart your program.

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

The events system uses both socket and inter-process messaging:
Communication from the host to the server uses the socket, and from the
server to the host it uses inter-process messages. This is for no reason
other than to simplify what already existed.

Changelog
---------

#### v1.2.1
 **\*** Removed `require("culinary")` from capsulator.js

#### v1.2.0
 **+** Start changelog<br/>
 **-** Removed old logger<br/>
 **-** Removed `culinary` dependency<br/>
 **-** Remove `suspend` dependency

#### v1.1.0
 **+** Add event system<br/>
 **+** Add constants<br/>
 **+** Add temporary server functions

#### v1.0.0
 **+** Initial version