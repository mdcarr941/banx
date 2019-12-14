import { MongoClient, Db, Collection } from "mongodb";

import config from "./config";

export class NonExistantCollectionError extends Error { }

export class DbClient {
    static readonly connectOptions = Object.freeze({
        useNewUrlParser: true,
        // We will attempt to reconnect indefinitely, but reject
        // requests immediately if we are not connected.
        reconnectTries: Number.MAX_VALUE,
        reconnectInterval: 250,
        bufferMaxEntries: 0
    });
    private _client: MongoClient;

    constructor(
        readonly uri: string = config.mongoUri,
    ) { }

    private getClient(): Promise<MongoClient> {
        if (this._client) return Promise.resolve(this._client);
        return MongoClient.connect(this.uri, DbClient.connectOptions)
        .then(client => {
            this._client = client;
            return client;
        });
    }

    public db(): Promise<Db> {
        return this.getClient()
        .then(client => client.db());
    }

    public collection(collectionName: string) : Promise<Collection<any>> {
        const promise: Promise<Collection<any>> = new Promise((resolve, reject) => {
            this.getClient()
            .then(client => {
                client.db().collection(collectionName, {strict: true},
                    (err, collection) => {
                        if (err) reject(new NonExistantCollectionError(err.message));
                        else resolve(collection);
                    });
            })
            .catch(err => {
                reject(err);
            });
        });
        return promise;
    }
}

export default new DbClient();