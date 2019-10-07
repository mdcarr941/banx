import { Collection, InsertOneWriteOpResult, Cursor } from 'mongodb';
import * as git from 'isomorphic-git';

import { Repository, IRepository, BanxUser } from './schema';
import client from './dbClient';
import { NonExistantCollectionError } from './dbClient';
import config from './config';

export class RepoRepo {
    static readonly repoCollectionName = 'repos';

    constructor(
        private repoCollection: Collection<IRepository>
    ) { }

    public get(name: string): Promise<Repository> {
        return this.repoCollection.findOne({name: name})
        .then(irepo => new Repository(irepo));
    }

    public del(name: string): Promise<boolean> {
        return this.repoCollection.deleteOne({name: name})
        .then(result => result.deletedCount > 0);
    }

    public insert(repo: Repository): Promise<InsertOneWriteOpResult> {
        return this.repoCollection.insertOne(repo.toSerializable());
    }

    public list(namePrefix?: string, caseInsensitive?: boolean): Cursor<string> {
        const searchArgs = (namePrefix)
            ? {name: {$regex: new RegExp('^' + namePrefix, (caseInsensitive === true) ? 'i' : '')}}
            : {};
        return this.repoCollection.find(searchArgs)
        .map(irepo => irepo.name);
    }

    public setUsers(name: string, users: BanxUser[]): Promise<boolean> {
        return this.repoCollection.updateOne({name: name}, {$set: {users: users}})
        .then(results => results.modifiedCount > 0);
    }

}

let GlobalRepoRepo: RepoRepo = null;
export async function getGlobalRepoRepo(): Promise<RepoRepo> {
    if (!GlobalRepoRepo) {
        GlobalRepoRepo = await client.collection(RepoRepo.repoCollectionName)
        .then(collection => new RepoRepo(collection))
        .catch(err => {
            if (err instanceof NonExistantCollectionError) {
                return client.db()
                .then(db => {
                    return db.createCollection(RepoRepo.repoCollectionName)
                    .then(collection => {
                        return collection.createIndex({name: 1}, {unique: true})
                        .then(() => new RepoRepo(collection));
                    });
                });
            }
            else throw err;
        });
    }
    return GlobalRepoRepo;
}