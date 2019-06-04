import { MongoClient, Db, Collection } from "mongodb";
import config from "./config";

export class NonExistantCollectionError extends Error { }

class DbClient {
    private _client: MongoClient;

    constructor(
        readonly uri: string = config.mongoUri,
    ) { }

    private get client(): Promise<MongoClient> {
        if (this._client) return new Promise(resolve => resolve(this._client));
        return MongoClient.connect(this.uri, {useNewUrlParser: true})
            .then(client => {
                this._client = client;
                return client;
            });
    }

    /**
     * Disconnect from the DB if connected. Returns false if this instance was
     * not connected and true otherwise.
     */
    public disconnect(): boolean {
        if (!this._client) return false;
        try {
            this._client.close();
        }
        finally {
            this._client = null;
            return true;
        }
    }

    public async db(name: string = ''): Promise<Db> {
        return this.client
            .then(client => client.db(name))
            .catch(err => {
                console.error(`DbClient: Unable to get the db object:\n${err.message}`);
                this.disconnect();
                throw err;
            });
    }

    public async collection(collectionName: string) : Promise<Collection<any>> {
        const promise: Promise<Collection<any>> = new Promise((resolve, reject) => {
            this.client
                .then(client => {
                    client.db().collection(collectionName, {strict: true},
                        (err, collection) => {
                            if (err) reject(new NonExistantCollectionError(err.message));
                            else resolve(collection);
                        });
                })
                .catch(err => {
                    this.disconnect();
                    reject(err);
                });
        });
        return promise;
    }
}

export default new DbClient();