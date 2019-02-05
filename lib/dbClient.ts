import { MongoClient, Db, Collection } from "mongodb";
import { Problem } from "./schema";

const mongoUri = 'mongodb://localhost:27017/banx';
const globalDefaultCollection = 'problems';

class DbClient {
    private client: MongoClient;

    constructor(
        readonly uri: string = mongoUri,
        readonly defaultCollection: string = globalDefaultCollection
    ) { }

    private async connect(): Promise<void> {
        await MongoClient.connect(this.uri, {useNewUrlParser: true}).then(client => {
            this.client = client;
        })
    }

    public disconnect(): void {
        if (!this.client) return;
        this.client.close();
        this.client = null;
    }

    public async db(): Promise<Db> {
        if (!this.client) await this.connect();
        return this.client.db();
    }

    public async collection(collection: string = this.defaultCollection): Promise<Collection<Problem>> {
        if (!this.client) await this.connect();
        const db = this.client.db();
        // TODO: write a validator for the default collection.
        return db.collection(collection);
    }
}

export default new DbClient();