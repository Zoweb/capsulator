/* Converts a node-style callback to a promise */

module.exports = function(fn, neverThrow) {

    const donePromise = args => new Promise((yay, nay) => {
        fn(...args, (err, ...data) => {
            if (neverThrow) {
                yay(err, ...data);
            } else {
                if (err) nay(err);
                else yay(...data);
            }
        });
    });

    return (...args) => donePromise(args);
};