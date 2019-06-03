import { Collection, Cursor, InsertOneWriteOpResult } from 'mongodb';

import client from './dbClient';
import { NonExistantCollectionError } from './dbClient';
import { IBanxUser, BanxUser } from './schema';

const userCollectionName = 'users';

export class UserRepo {
    constructor(
        private userCollection: Collection<IBanxUser>
    ) { }

    public static create(): Promise<UserRepo> {
        return new Promise((resolve, reject) => {
            client.collection(userCollectionName)
            .then(userCollection => resolve(new UserRepo(userCollection)))
            .catch(err => {
                if (err instanceof NonExistantCollectionError) {
                    client.db()
                    .then(client => {
                        client.createCollection(userCollectionName, (err, userCollection) => {
                            if (err) reject(err);
                            else userCollection.createIndex({glid: 1}, (err, result) => {
                                if (err) reject(err);
                                else resolve(new UserRepo(userCollection));
                            });
                        });
                    });
                }
                else throw err;
            });
        });
    }

    public async get(glid: string): Promise<BanxUser> {
        return this.userCollection.findOne({glid: glid})
            .then(iuser => new BanxUser(iuser));
    }

    public async del(glid: string): Promise<boolean> {
        return this.userCollection.deleteOne({glid: glid})
            .then(result => result.deletedCount > 1);
    }

    public insert(user: BanxUser): Promise<InsertOneWriteOpResult> {
        return this.userCollection.insertOne(user)
    }

    public list(): Cursor<BanxUser> {
        return this.userCollection.find({}).map(ibanx => new BanxUser(ibanx));
    }
}