// This program sets up an environment (mongo database and repository directory)
// so that all tests are run in a fresh state.

const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const child_process = require('child_process');
const mongodb = require('mongodb');

const config = Object.freeze({
    mongoServer: process.env.MONGO_SERVER || 'mongodb://localhost:27017',
    repoBasename: process.env.REPO_BASENAME || 'repositories'
});

function getClient() {
    return mongodb.MongoClient.connect(
        config.mongoServer, {useNewUrlParser: true}
    );
}

async function makeTestingDb() {
    const client = await getClient();

    const dbs = await client.db('admin').admin().listDatabases();

    const dbNames = dbs.databases.map(db => db.name);

    let baseName = 'banxTest';
    let testingDbName = baseName;
    let counter = 1;
    while (dbNames.indexOf(testingDbName) >= 0) {
        counter += 1;
        testingDbName = baseName + counter.toString();
    }

    return testingDbName;
}

function mongoUri(testingDbName) {
    return config.mongoServer.trimRight('/') + '/' + testingDbName;
}

async function dropTestingDb(testingDbName) {
    const client = await getClient();
    const db = client.db(testingDbName);
    await db.dropDatabase();
}

async function makeTempRepoDir() {
    const basePath = path.join(os.tmpdir(), config.repoBasename);
    let fullPath = basePath;
    let counter = 1;
    while (await fs.access(fullPath).then(() => true).catch(() => false)) {
        counter += 1;
        fullPath = basePath + counter.toString();
    }
    await fs.mkdir(fullPath);
    return fullPath;
}

async function runJasmine(repoDir, testingDbName) {
    const subproc = child_process.spawn(
        'node', ['node_modules/jasmine/bin/jasmine.js'], { env: {
            ...process.env,
            REPO_DIR: repoDir,
            MONGO_URI: mongoUri(testingDbName)
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

async function exitWith(code, repoDir, testingDbName) {
    let promises = [];
    if (repoDir) promises.push(fs.rmdir(repoDir, { recursive: true }));
    if (testingDbName) promises.push(dropTestingDb(testingDbName));
    await Promise.all(promises);
    process.exit(code);
}

(async function() {
    let repoDir, testingDbName;
    try {
        [repoDir, testingDbName] = await Promise.all([
            makeTempRepoDir(), makeTestingDb()
        ]);
    }
    catch (err) {
        console.error('failed to initialize testing environment:');
        console.error(err);
        exitWith(1, repoDir, testingDbName);
    }

    let code;
    try {
        code = await runJasmine(repoDir, testingDbName);
    }
    catch (err) {
        console.error('An unhandled error occured:');
        console.error(err);
        if (typeof err == 'number') code = err;
        else code = 1;
    }

    exitWith(code, repoDir, testingDbName);
})();