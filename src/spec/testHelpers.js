// A collection of function to facilitate testing.
const fs = require('fs').promises;

exports.pathExists = async function(path) {
    return fs.access(path).then(() => true).catch(() => false);
}