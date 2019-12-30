// A collection of function to facilitate testing.
const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const child_process = require('child_process');

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
        tmpPath = path.join(tmp, 'tempDir_' + randomString(nameLen));
    } while (await exports.pathExists(tmpPath));
    await fs.mkdir(tmpPath);
    return tmpPath;
}

function spawn(command, args, options) {
    const subproc = child_process.spawn(command, args, options);

    subproc.stdout.pipe(process.stdout);
    subproc.stderr.on('data', chunk => {
        console.error(`git stderr: ${chunk.toString().trimRight()}`);
    });
    process.stdin.pipe(subproc.stdin);
    const exit = new Promise((resolve, reject) => {
        subproc.on('exit', (code, signal) => {
            if (code || signal) {
                console.error(`Git exited abnormally: code = ${code}, signal = ${signal}`);
                reject(code);
            }
            else resolve(code);
        });
    });
    const error = new Promise((resolve, reject) => {
        subproc.on('error', (err) => {
            console.error('The git subprocess threw an error:');
            console.error(err);
            reject(err);
        });
    });

    return Promise.race([exit, error]);
}

function authHeader(userId) {
    return `http.extraHeader=ufshib_eppn: ${userId}`
}

exports.gitClone = function(sourceUrl, destPath, userId) {
    return spawn('git', 
    [
        '-c', authHeader(userId),
        'clone', sourceUrl,
        destPath
    ]);
}

exports.gitAdd = function(dir, filepath, userId) {
    return spawn('git', [
        '-c', authHeader(userId),
        'add', filepath
    ], {
        cwd: dir
    });
}

exports.gitCommit = function(dir, message, userId) {
    return spawn('git', [
        '-c', authHeader(userId),
        'commit',
        '-m', message,
        '--author', `${userId} <${userId}@ufl.edu>`
    ], {
        cwd: dir
    });
}

exports.gitPush = function(dir, userId) {
    return spawn('git', [
        '-c', authHeader(userId),
        'push'
    ], {
        cwd: dir
    });
}