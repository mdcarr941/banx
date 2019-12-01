import { ObjectID } from 'mongodb';
import * as git from 'isomorphic-git';

import { urlJoin } from './common';
import config from './config';

export interface KeyValPair {
    key: string;
    value: string;
}

export interface IMongoObject {
    _id?: ObjectID;
    idStr?: string;
}

export interface IProblem extends IMongoObject {
    tags?: KeyValPair[];
    content?: string;
}

export class Problem implements IProblem {
    public _id: ObjectID = null; // This should always be set on the server.
    public idStr: string = null; // This should always be set on the client.
    public tags: KeyValPair[] = [];
    public content: string;

    constructor(obj?: IProblem) {
        if (!obj) return;
        this._id = obj._id;
        this.idStr = obj.idStr;
        this.tags.push(...obj.tags);
        this.content = obj.content;
    }

    public values(tag: string): string[] {
        return this.tags.filter(kv => kv.key == tag).map(kv => kv.value);
    }

    public value(tag: string): string {
        const values = this.values(tag);
        if (values.length == 1) {
            return values[0];
        } else if (values.length == 0) {
            throw new Error('Tag not found: ' + tag);
        } else {
            throw new Error('Multiple values found for: ' + tag);
        }
    }

    public formatTags(): string {
        return this.tags.map(kv => `${kv.key}@${kv.value}`).join(' ');
    }

    public toString(): string {
        return `%%%%%%%%%%%%%%%%%%%%%%%
%%\\taged{${this.formatTags()}}{
${this.content}
%}`;
    }

    public copy(): Problem {
        return new Problem(this);
    }

    public toJSON(): object {
        const idStr = this._id ? this._id.toHexString() : this.idStr;
        return {
            idStr: idStr,
            tags: this.tags,
            content: this.content
        };
    }
}

export function invert(object: any): any {
    const inverse: any = {};
    for (let key in object) {
        if (!object.hasOwnProperty(key)) continue;
        inverse[object[key]] = key;
    }
    return inverse;
}

export enum UserRole {
    Admin = 'Admin',
    Author = 'Author'
}

export const UserRoleInverse: {[userRoleName: string]: UserRole} = invert(UserRole);

export interface IBanxUser extends IMongoObject {
    glid: string;
    roles: UserRole[];
}

export class BanxUser implements IBanxUser {
    public _id: ObjectID = null;
    public idStr: string = null;
    public glid: string;
    public roles: UserRole[];

    constructor(obj?: IBanxUser) {
        if (!obj) return;
        if (typeof(obj._id) === 'string') this.idStr = obj._id;
        else this._id = obj._id;
        this.glid = obj.glid || "";
        this.roles = obj.roles || [];
    }

    public isAdmin(): boolean {
        return this.roles.indexOf(UserRole.Admin) >= 0;
    }

    public isAuthor(): boolean {
        return this.roles.indexOf(UserRole.Author) >= 0;
    }

    public canEdit(): boolean {
        return this.isAdmin() || this.isAuthor();
    }

    public toString(): string {
        return `_id: ${this._id}, glid: ${this.glid}, roles: ${this.roles.map(role => role.toString()).join(',')}`;
    }
}

export interface IRepository extends IMongoObject {
    name: string; // Primary Identifier
    userIds?: string[];
}

export class Repository implements IRepository {
    private readonly fsModule: any;

    public readonly _id: ObjectID;
    public readonly idStr: string;
    public name: string;
    public readonly userIds: string[];

    private _path: string = null;
    public get path(): string {
        if (null === this._path) {
            if (null === this.idStr) {
                throw new Error(
                    "An attempt was made to access the path of a repository before it has been assign a database ID."
                );
            }
            this._path = urlJoin(config.repoDir, this.idStr.slice(0, 2), this.idStr);
        }
        return this._path;
    }

    constructor(obj: IRepository, fsModule: any) {
        this._id = obj._id;
        this.idStr = (!this._id) ? null : this._id.toHexString();
        this.name = obj.name;
        this.userIds = obj.userIds || [];
        this.fsModule = fsModule;
    }

    public isUserAuthorized(userId: string): boolean {
        return this.userIds.indexOf(userId) >= 0;
    }

    public toSerializable(): IRepository {
        return {name: this.name, userIds: this.userIds};
    }

    public fullPath(sub?: string): string {
        if (sub) return urlJoin(this.path, sub);
        else return this.path;
    }

    public mkdir(sub?: string): Promise<void> {
        return this.fsModule.promises.mkdir(this.fullPath(sub), {recursive: true});
    }

    public async _rm(sub: string, isDirectory?: boolean): Promise<void> {
        if (undefined === isDirectory) {
            isDirectory = (await this.fsModule.promises.lstat(sub)).isDirectory();
        }
        if (false === isDirectory) return this.fsModule.promises.unlink(sub);

        const entries = await this.fsModule.promises.readdir(sub, {withFileTypes: true});
        const promises = [];
        for (let entry of entries) {
            const nextSub = urlJoin(sub, entry.name);
            promises.push(this._rm(nextSub, entry.isDirectory()));
        }
        await Promise.all(promises);
        return this.fsModule.promises.rmdir(sub);
    }

    public async rm(sub?: string): Promise<void> {
        const path = this.fullPath(sub);
        return this._rm(path);
    }

    public async init(): Promise<void> {
        await this.mkdir();
        return git.init({
            fs: this.fsModule,
            gitdir: this.path,
            bare: true
        });
    }
}

// export function NewRepo(irepo: IRepository): Repository {

// }