const mongodb = require('mongodb');

const config = {
    mongoServer: process.env.MONGO_SERVER || 'mongodb://localhost:27017'
};

function getClient() {
    return mongodb.MongoClient.connect(
        config.mongoServer, {useNewUrlParser: true}
    );
}

exports.makeMongoUri = async function() {
    const client = await getClient();

    const adminDb = client.db('admin');
    const dbs = await adminDb.admin().listDatabases();

    const dbNames = dbs.databases.map(db => db.name);

    let baseName = 'banxTest';
    let testingDbName = baseName;
    let counter = 1;
    while (dbNames.indexOf(testingDbName) >= 0) {
        counter += 1;
        testingDbName = baseName + counter.toString();
    }

    config.testingDbName = testingDbName;
    config.mongoUri = config.mongoServer + '/' + testingDbName;
    return config.mongoUri;
}

exports.dropTestingDb = async function() {
    if (!config.testingDbName) throw new Error('config.testingDbName has not been initialized.');

    const client = await getClient();
    const db = client.db(config.testingDbName);
    await db.dropDatabase();
}