import { Collection, InsertOneWriteOpResult, Cursor } from 'mongodb';
import * as git from 'isomorphic-git';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { fstat } from 'fs';

import { MongoObject, IRepository, BanxUser } from './schema';
import client from './dbClient';
import { NonExistantCollectionError } from './dbClient';
import config from './config';

export class Repository extends MongoObject implements IRepository {
    public readonly name: string;
    public readonly glids: string[];
    public readonly path: string;

    constructor(obj: IRepository) {
        super();
        this.name = obj.name;
        this.glids = obj.glids || [];
        const nameDigest = crypto.createHash('sha256').update(this.name).digest('hex');
        this.path = path.join(config.repoDir, nameDigest.slice(0, 2) + path.sep + nameDigest);
    }

    public toSerializable(): IRepository {
        return {name: this.name, glids: this.glids};
    }

    public fullPath(sub: string): string {
        return path.join(this.path, sub);
    }

    public mkdir(sub: string): Promise<void> {
        return fs.promises.mkdir(this.fullPath(sub), {recursive: true});
    }

    public async _rm(sub: string, isDirectory?: boolean): Promise<void> {
        if (undefined === isDirectory) {
            isDirectory = (await fs.promises.lstat(sub)).isDirectory();
        }
        if (false === isDirectory) return fs.promises.unlink(sub);

        const entries = await (<any>fs).promises.readdir(sub, {withFileTypes: true});
        const promises = [];
        for (let entry of entries) {
            const nextSub = path.join(sub, entry.name);
            promises.push(this._rm(nextSub, entry.isDirectory()));
        }
        await Promise.all(promises);
        return fs.promises.rmdir(sub);
    }

    public async rm(sub: string): Promise<void> {
        return this._rm(this.fullPath(sub));
    }

    // public writeFile(filePath: string, contents: string): Promise<void> {

    // }
}

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