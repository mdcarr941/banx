import { Collection, Cursor, ObjectId } from 'mongodb';
import * as fs from 'fs';

import { IRepository, Repository } from './schema';
import client from './dbClient';
import { NonExistantCollectionError } from './dbClient';

export class RepoRepo {
    static readonly repoCollectionName = 'repos';

    constructor(
        private repoCollection: Collection<IRepository>
    ) { }

    public get(name: string): Promise<Repository> {
        return this.repoCollection.findOne({name: name})
        .then(irepo => new Repository(irepo, fs));
    }

    public getByIdStr(idStr: string): Promise<Repository> {
        return this.repoCollection.findOne({_id: ObjectId.createFromHexString(idStr)})
        .then(irepo => new Repository(irepo, fs));
    }

    public async del(name: string): Promise<boolean> {
        const result = await this.repoCollection.findOneAndDelete({name: name})
        if (result.ok !== 1) return false;
        const repo = new Repository(result.value, fs);
        await repo.rm();
        return true;
    }

    public list(namePrefix?: string, caseInsensitive?: boolean): Cursor<string> {
        const searchArgs = (namePrefix)
            ? {name: {$regex: new RegExp('^' + namePrefix, (caseInsensitive === true) ? 'i' : '')}}
            : {};
        return this.repoCollection.find(searchArgs)
        .map(irepo => irepo.name);
    }

    public async upsert(repo: Repository): Promise<Repository> {
        if (null == repo._id) {
            repo = await this.repoCollection.insertOne(repo)
                .then(output => {
                    if (1 !== output.result.ok) throw new Error("RepoRepo.upsert failed to insert a new repository.")
                    return new Repository({_id: output.insertedId, name: repo.name, userIds: repo.userIds}, fs);
                });
            await repo.init();
            return repo;
        }
        else {
            return this.repoCollection
            .findOneAndReplace({_id: repo._id}, repo.toSerializable(), {upsert: false, returnOriginal: false})
            .then(result => {
                if (1 == result.ok) return new Repository(result.value, fs);
                else throw new Error('RepoRepo.update failed to update the repository named: ' + repo.name);
            });
        }
    }

    public getEditorsRepos(userId: string): Cursor<Repository> {
        return this.repoCollection.find({ userIds: userId })
        .map(irepo => new Repository(irepo, fs));
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