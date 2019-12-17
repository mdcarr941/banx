import { Collection, Cursor, ObjectId } from 'mongodb';
import * as git from 'isomorphic-git';
import * as path from 'path';
import * as fs from 'fs';
import { ObjectID } from 'mongodb';

import { IRepository } from './schema';
import client, { DbClient } from './dbClient';
import { NonExistantCollectionError } from './dbClient';
import config from './config';

export class Repository implements IRepository {
    public readonly _id: ObjectID;
    public name: string;
    public readonly userIds: string[];

    private _path: string = null;
    public get path(): string {
        if (null === this._path) {
            if (null === this._id) {
                throw new Error(
                    "An attempt was made to access the path of a repository before it has been assign a database ID."
                );
            }
            this._path = path.join(config.repoDir, this.dir());
        }
        return this._path;
    }

    constructor(obj: IRepository) {
        if (typeof obj._id === 'string') this._id = ObjectID.createFromHexString(obj._id);
        else if (obj._id) this._id = obj._id;
        this.name = obj.name;
        this.userIds = obj.userIds || [];
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

    public async rm(sub?: string): Promise<void> {
        const path = this.fullPath(sub);
        return this._rm(path);
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
        return this.repoCollection.findOne({name: name})
        .then(irepo => new Repository(irepo));
    }

    public getByIdStr(idStr: string): Promise<Repository> {
        return this.repoCollection.findOne({_id: ObjectId.createFromHexString(idStr)})
        .then(irepo => new Repository(irepo));
    }

    public async del(name: string): Promise<boolean> {
        const result = await this.repoCollection.findOneAndDelete({name: name})
        if (result.ok !== 1) return false;
        const repo = new Repository(result.value);
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