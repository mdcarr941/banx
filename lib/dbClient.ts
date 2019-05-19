import { MongoClient, Db, Collection } from "mongodb";
import config from "./config";

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
            .then(client => client.db())
            .catch(err => {
                console.error('DbClient: Unable to get the db object.');
                this.disconnect();
                throw err;
            });
    }

    public async collection(collection: string): Promise<Collection<any>> {
        // TODO: write a validator for the default collection.
        return this.client
            .then(client => client.db().collection(collection))
            .catch(err => {
                console.error(`DbClient: unable to get collection ${collection}.`);
                this.disconnect();
                throw err;
            });
    }
}

export default new DbClient();