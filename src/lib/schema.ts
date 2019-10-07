import { ObjectID } from 'mongodb';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { fstat } from 'fs';

import config from './config';

export interface KeyValPair {
    key: string;
    value: string;
}

export interface IMongoObject {
    _id?: ObjectID;
    idStr?: string;
}

export abstract class MongoObject implements IMongoObject {
    _id: ObjectID = null;
    idStr: string = null;
}

export interface IProblem extends IMongoObject {
    tags?: KeyValPair[];
    content?: string;
}

export class Problem extends MongoObject implements IProblem {
    public _id: ObjectID = null; // This should always be set on the server.
    public idStr: string = null; // This should always be set on the client.
    public tags: KeyValPair[] = [];
    public content: string;

    constructor(obj?: IProblem) {
        super();
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

export class BanxUser extends MongoObject implements IBanxUser {
    public _id: ObjectID = null;
    public idStr: string = null;
    public glid: string;
    public roles: UserRole[];

    constructor(obj?: IBanxUser) {
        super();
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
    glids?: string[];
}

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