import { MongoClient, Db, Collection } from "mongodb";
import config from "./config";

class DbClient {
    private _client: MongoClient;

    constructor(
        readonly uri: string = config.mongoUri,
        readonly defaultCollection: string = config.problemCollection
    ) { }

    private get client(): Promise<MongoClient> {
        if (this._client) return new Promise(resolve => resolve(this._client));
        return new Promise((resolve, reject) => {
            MongoClient.connect(this.uri, {useNewUrlParser: true})
                .then(client => {
                    this._client = client;
                    resolve(client);
                })
                .catch(err => {
                    console.error(`DbClient: Failed to connect to '${this.uri}'.`);
                    reject(err);
                })
        });
    }

    private printError<T>(message: string, err: Error) {
        const showMessage = err && err.message && err.message.length > 0;
        console.error(`DbClient: ${message}${showMessage ? ':' : ''}`);
        if (showMessage) console.error(err.message);
    }

    /**
     * Disconnect from the DB if connected. Returns false if this instance was
     * disconnected and true otherwise.
     */
    public disconnect(): boolean {
        if (!this._client) return false;
        this._client.close();
        this._client = null;
        return true;
    }

    public async db(): Promise<Db> {
        return this.client
            .then(client => client.db())
            .catch(err => {
                this.printError<Db>('Failed to get db', err)
                throw err;
            });
    }

    public async collection(collection: string = this.defaultCollection): Promise<Collection<any>> {
        // TODO: write a validator for the default collection.
        return this.client
            .then(client => client.db().collection(collection))
            .catch(err => {
                this.printError<Collection<any>>(`Failed to get collection '${collection}'`, err);
                throw err;
            });
    }
}

export default new DbClient();