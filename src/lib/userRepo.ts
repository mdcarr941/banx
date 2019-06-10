import { Collection, Cursor, InsertOneWriteOpResult } from 'mongodb';

import client from './dbClient';
import { NonExistantCollectionError } from './dbClient';
import { IBanxUser, BanxUser } from './schema';

export class UnknownUserError extends Error { }

export class UserRepo {
    static readonly userCollectionName: string = 'users';

    constructor(
        private userCollection: Collection<IBanxUser>
    ) { }

    public static create() : Promise<UserRepo> {
        return client.collection(UserRepo.userCollectionName)
        .then(userCollection => new UserRepo(userCollection))
        .catch(err => {
            if (err instanceof NonExistantCollectionError) {
                return client.db()
                .then(client => {
                    return client.createCollection(UserRepo.userCollectionName)
                    .then(userCollection => {
                        return userCollection.createIndex({glid: 1}, {unique: true})
                        .then(() => new UserRepo(userCollection));
                    });
                });
            }
            else throw err;
        });
    }

    public get(glid: string): Promise<BanxUser> {
        return this.userCollection.findOne({glid: glid})
        .then(iuser => {
            if (iuser) return new BanxUser(iuser);
            throw new UnknownUserError(glid);
        });
    }

    public del(glid: string): Promise<boolean> {
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