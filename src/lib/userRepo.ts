import { Collection, Cursor, InsertOneWriteOpResult } from 'mongodb';

import client from './dbClient';
import { NonExistantCollectionError } from './dbClient';
import { IBanxUser, BanxUser } from './schema';

const userCollectionName = 'users';

export class UnknownUserError extends Error { }

export class UserRepo {
    constructor(
        private userCollection: Collection<IBanxUser>
    ) { }

    public static create() : Promise<UserRepo> {
        return client.collection(userCollectionName)
        .then(userCollection => new UserRepo(userCollection))
        .catch(err => {
            if (err instanceof NonExistantCollectionError) {
                return client.db()
                .then(client => {
                    return client.createCollection(userCollectionName)
                    .then(userCollection => {
                        return userCollection.createIndex({glid: 1}, {unique: true})
                        .then(() => new UserRepo(userCollection));
                    });
                });
            }
            else throw err;
        });
    }

    public async get(glid: string): Promise<BanxUser> {
        return this.userCollection.findOne({glid: glid})
            .then(iuser => {
                if (iuser) return new BanxUser(iuser);
                throw new UnknownUserError(glid);
            });
    }

    public async del(glid: string): Promise<boolean> {
        return this.userCollection.deleteOne({glid: glid})
            .then(result => result.deletedCount > 0);
    }

    public insert(user: BanxUser): Promise<InsertOneWriteOpResult> {
        return this.userCollection.insertOne(user)
    }

    public list(): Cursor<BanxUser> {
        return this.userCollection.find({}).map(ibanx => new BanxUser(ibanx));
    }
}