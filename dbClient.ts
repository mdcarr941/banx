import { MongoClient, Db, Collection } from "mongodb";
import { Problem } from "./schema";

const mongoUri = 'mongodb://localhost:27017/banx';
const defaultCollection = 'problems';

class DbClient {
    private _client: MongoClient;

    private async connect(): Promise<void> {
        await MongoClient.connect(mongoUri, {useNewUrlParser: true}).then(client => {
            this._client = client;
        })
    }

    public disconnect(): void {
        if (!this._client) return;
        this._client.close();
        this._client = null;
    }

    public async db(): Promise<Db> {
        if (!this._client) await this.connect();
        return this._client.db();
    }

    public async collection(collection?: string): Promise<Collection<Problem>> {
        if (!collection) collection = defaultCollection;
        if (!this._client) await this.connect();
        const db = this._client.db();
        // TODO: write a validator for the default collection.
        return db.collection(collection);
    }
}

export default new DbClient();