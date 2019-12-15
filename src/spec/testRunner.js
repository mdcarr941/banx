const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const child_process = require('child_process');

async function makeTempRepoDir() {
    const basePath = path.join(os.tmpdir(), 'repositories');
    let fullPath = basePath;
    let counter = 1;
    while (await fs.access(fullPath).then(() => true).catch(() => false)) {
        counter += 1;
        fullPath = basePath + counter.toString();
    }
    await fs.mkdir(fullPath);
    return fullPath;
}

async function main(repoDir) {
    const subproc = child_process.spawn(
        'node', ['node_modules/jasmine/bin/jasmine.js'], { env: {
            ...process.env,
            REPO_DIR: repoDir
        } }
    );
    subproc.stdout.pipe(process.stdout);
    subproc.stderr.pipe(process.stderr);
    process.stdin.pipe(process.stdin);
    const exit = new Promise((resolve, reject) => {
        subproc.on('exit', (code, signal) => {
            if (code || signal) {
                console.error(`subproc exited abnormally: code = ${code}, signal = ${signal}`);
                reject(code);
            }
            else resolve(code);
        });
    });
    const error = new Promise((resolve, reject) => {
        subproc.on('error', err => {
            console.error('An error occured in subproc:');
            console.error(err);
            reject(1);
        });
    });
    return Promise.race([exit, error]);
}

async function exitWith(code, repoDir) {
    await fs.rmdir(repoDir, { recursive: true });
    process.exit(code);
}

(async function() {
    let repoDir;
    try {
        repoDir = await makeTempRepoDir();
    }
    catch (err) {
        console.error('makeTempRepoDir failed:');
        console.error(err);
        process.exit(1);
    }

    let code;
    try {
        code = await main(repoDir);
    }
    catch (err) {
        console.error('An unhandled error occured:');
        console.error(err);
        if (typeof err == 'number') code = err;
        else code = 1;
    }

    exitWith(code, repoDir);
})();