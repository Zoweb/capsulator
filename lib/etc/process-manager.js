/* Runs new processes with code */
const cluster = require("cluster");
const logger = require("../console/logger").create("process.manager");
const path = require('path');

if (cluster.isMaster) {
    cluster.setupMaster({exec: __filename});

    module.exports = function(fn, errFn) {
        let worker = cluster.fork();
        //worker.send(fn.toString().replace(/(^.*?{|}$)/g, ""));

        worker.on("exit", code => {
            logger.warn(`A server broke! Exit code is ${code}`);
            errFn();
        });

        worker.on("message", message => {
            let data = JSON.parse(message);

            switch (data.name) {

            }
        });
    };

    module.exports.createNewProcess = function(filename, error) {
        logger.debug("Forking a new process:", filename);

        cluster.setupMaster({exec: filename});

        let worker = cluster.fork();

        worker.on("exit", code => {
            if (code === 7) return;

            logger.warn(`A server broke! Exit code is ${code}. You might want to fix whatever broke the server.`);

            error();
        });

        return worker;
    }
} else {
    logger.debug(`(child process) Started process. PID ${process.pid}`);

    function createFunction(name) {
        return args => {
            process.send(JSON.stringify({
                name: name,
                args: args
            }));
        };
    }
}