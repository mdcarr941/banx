// A collection of function to facilitate testing.
const fs = require('fs').promises;
const os = require('os');
const path = require('path');

exports.pathExists = async function(path) {
    return fs.access(path).then(() => true).catch(() => false);
}

function uniform(a, b) {
    return a + (b - a) * Math.random();
}

function randomString(len) {
    const chars = new Array(len);
    for (k = 0; k < len; k += 1) {
        // Code points 97 to 122 are the lowercase latin alphabet, i.e. [a-z].
        chars[k] = Math.round(uniform(97, 122));
    }
    return chars.map(n => String.fromCharCode(n)).join('');
}

exports.getTempDir = async function(nameLen) {
    if (!nameLen) nameLen = 32;
    const tmp = os.tmpdir();
    let tmpPath;
    do {
        tmpPath = path.join(tmp, randomString(nameLen));
    } while (await exports.pathExists(tmpPath));
    await fs.mkdir(tmpPath);
    return tmpPath;
}