import { Collection, Cursor, ObjectID } from 'mongodb';
import * as git from 'isomorphic-git';
import * as path from 'path';
import * as fs from 'fs';

import { IRepository } from './schema';
import client, { DbClient, NonExistantCollectionError } from './dbClient';
import config from './config';

export async function rm(sub: string, isDirectory?: boolean): Promise<void> {
    if (undefined === isDirectory) {
        isDirectory = (await fs.promises.lstat(sub)).isDirectory();
    }
    if (false === isDirectory) return fs.promises.unlink(sub);

    const entries = await (<any>fs).promises.readdir(sub, {withFileTypes: true});
    const promises = [];
    for (let entry of entries) {
        const nextSub = path.join(sub, entry.name);
        promises.push(rm(nextSub, entry.isDirectory()));
    }
    await Promise.all(promises);
    return fs.promises.rmdir(sub);
}

export class Repository implements IRepository {
    public readonly _id: ObjectID;
    public name: string;
    public readonly userIds: string[];

    public readonly path: string;

    constructor(obj: IRepository) {
        if (typeof obj._id === 'string') this._id = ObjectID.createFromHexString(obj._id);
        else if (obj._id) this._id = obj._id;
        this.name = obj.name;
        this.userIds = obj.userIds || [];

        if (this._id) this.path = path.join(config.repoDir, this.dir());
        else this.path = null;
    }

    public dir(): string {
        const idStr = this._id.toHexString();
        return path.join(idStr.slice(0, 2), idStr) + '.git';
    }

    public isUserAuthorized(userId: string): boolean {
        return this.userIds.indexOf(userId) >= 0;
    }

    public toJSON(): IRepository {
        return {_id: this._id.toHexString(), name: this.name, userIds: this.userIds};
    }

    public fullPath(sub?: string): string {
        if (sub) return path.join(this.path, sub);
        else return this.path;
    }

    public mkdir(sub?: string): Promise<void> {
        return fs.promises.mkdir(this.fullPath(sub), {recursive: true});
    }

    public async rm(sub?: string): Promise<void> {
        return rm(this.fullPath(sub));
    }

    public async init(): Promise<void> {
        await this.mkdir();
        return git.init({
            fs: fs,
            gitdir: this.path,
            bare: true
        });
    }
}

export class RepoRepo {
    static readonly collectionName = 'repos';

    constructor(
        private repoCollection: Collection<IRepository>
    ) { }

    private static async makeRepoCollection(client: DbClient): Promise<Collection<IRepository>> {
        const db = await client.db();
        const collection = await db.createCollection(RepoRepo.collectionName);
        collection.createIndex({name: 1}, {unique: true});
        return collection;
    }

    public static async create(client: DbClient): Promise<RepoRepo> {
        let collection: Collection<IRepository>;
        try {
            collection = await client.collection(RepoRepo.collectionName);
        }
        catch (err) {
            if (err instanceof NonExistantCollectionError) {
                collection = await RepoRepo.makeRepoCollection(client);
            }
            else throw err;
        };
        return new RepoRepo(collection);
    }

    public get(name: string): Promise<Repository> {
        return this.repoCollection.findOne({name})
        .then(irepo => irepo ? new Repository(irepo) : null);
    }

    public getByIdStr(idStr: string): Promise<Repository> {
        return this.repoCollection.findOne({_id: ObjectID.createFromHexString(idStr)})
        .then(irepo => irepo ? new Repository(irepo) : null);
    }

    // A return value of true indicates the given repository was in the
    // database and has been removed. A value of false indicates that
    // the given name was not in the database to begin with.
    public async del(name: string): Promise<boolean> {
        const result = await this.repoCollection.findOneAndDelete({name: name});
        if (result.ok !== 1) return false;

        if (result.value) {
            const repo = new Repository(result.value);
            await repo.rm();
            return true;
        }
        else {
            return false;
        }
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
                    return new Repository({_id: output.insertedId, name: repo.name, userIds: repo.userIds});
                });
            await repo.init();
            return repo;
        }
        else {
            return this.repoCollection
            .findOneAndReplace({_id: repo._id}, repo, {upsert: false, returnOriginal: false})
            .then(result => {
                if (1 == result.ok) return new Repository(result.value);
                else throw new Error('RepoRepo.update failed to update the repository named: ' + repo.name);
            });
        }
    }

    public getEditorsRepos(userId: string): Cursor<Repository> {
        return this.repoCollection.find({ userIds: userId })
        .map(irepo => new Repository(irepo));
    }
}

let GlobalRepoRepo: RepoRepo = null;
export async function getGlobalRepoRepo(): Promise<RepoRepo> {
    if (!GlobalRepoRepo) {
        GlobalRepoRepo = await RepoRepo.create(client);
    }
    return GlobalRepoRepo;
}