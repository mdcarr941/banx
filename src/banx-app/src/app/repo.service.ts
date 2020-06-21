import { Injectable, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import FS, { Stat } from '@isomorphic-git/lightning-fs';
import {
  clone as gitClone,
  plugins as gitPlugins,
  pull as gitPull,
  commit as gitCommit,
  push as gitPush,
  add as gitAdd,
  status as gitStatus,
  remove as gitRemove,
  fetch as gitFetch,
  merge as gitMerge,
  checkout as gitCheckout,
  expandRef,
  PushResponse,
  FetchResponse,
  resolveRef
} from 'isomorphic-git';
import { RemoteUserService } from './remote-user.service';

import { BaseService } from './base.service';
import { IRepository } from '../../../lib/schema';
import { forEach, urlJoin, stripHead, isAbsolute } from '../../../lib/common';

const fs = (function() {
  const _fs = new FS('banxFS');
  gitPlugins.set('fs', _fs);
  return _fs.promises;
})();

// TODO: remove the following assignments.
(window as any).git = Object.freeze({
  status: gitStatus
});
(window as any).fs = fs;

function copyIfExists(from: any, to: any): void {
  forEach(from, (key, val) => {
    if (undefined !== to[key]) to[key] = val;
  });
}

// The encoding to use for all files.
const stringEncoding = 'utf8';

export function exists(path: string): Promise<boolean> {
  return fs.stat(path).then(() => true).catch(() => false);
}

export function ls(path: string): Promise<string[]> {
  return fs.readdir(path);
}

export async function lsStats(path: string): Promise<{[name: string]: Stat}> {
  const names = await fs.readdir(path);
  const output: {[name: string]: Stat} = {};
  for (let name of names) {
    output[name] = await fs.stat(urlJoin(path, name));
  }
  return output
}

export function mkdir(path: string): Promise<void> {
  return fs.mkdir(path);
}

export function touch(path: string): Promise<void> {
  return fs.writeFile(path, '', {encoding: stringEncoding});
}

export function mv(oldPath: string, newPath: string): Promise<void> {
  return fs.rename(oldPath, newPath);
}

export function cat(path: string): Promise<string> {
  return fs.readFile(path, {encoding: stringEncoding});
}

export async function echo(path: string, text: string, truncate?: boolean): Promise<void> {
  if (truncate) return fs.writeFile(path, text, {encoding: stringEncoding});
  const contents = await fs.readFile(path, {encoding: stringEncoding});
  return fs.writeFile(path, contents + text, {encoding: stringEncoding});
}

export function isdir(path: string): Promise<boolean> {
  return fs.stat(path)
    .then(stat => stat.isDirectory())
    .catch(err => false);
}

export function isfile(path: string): Promise<boolean> {
  return fs.stat(path)
    .then(stat => stat.isFile())
    .catch(() => false);
}

export function rm(path: string): Promise<void> {
  return fs.unlink(path);
}

export function rmdir(path: string): Promise<void> {
  return fs.rmdir(path);
}

async function _walk({
  path,
  fileCallback,
  dirFilter,
  afterAll
}: {
  path: string,
  fileCallback: (abspath: string) => Promise<void>,
  dirFilter: (abspath: string) => Promise<boolean>,
  afterAll: (abspath: string) => Promise<void>
}): Promise<void> {
  const stats = await lsStats(path);
  const promises = [];
  for (let name in stats) {
    const subpath = urlJoin(path, name);
    if (stats[name].isDirectory()) {
      if (await dirFilter(subpath)) {
        promises.push(_walk({ path: subpath, fileCallback, dirFilter, afterAll }));
      }
    }
    else {
      const promise = fileCallback(subpath);
      if (promise) promises.push(promise);
    }
  }
  await Promise.all(promises);
  await afterAll(path);
}

export function walk({
  path,
  fileCallback,
  dirFilter = async () => true,
  afterAll = async () => { return; }
}: {
  path: string,
  fileCallback: (abspath: string) => Promise<void>,
  dirFilter?: (abspath: string) => Promise<boolean>,
  afterAll?: (abspath: string) => Promise<void>
}): Promise<void> {
  return _walk({ path, fileCallback, dirFilter, afterAll });
}

export async function rmAll(path: string): Promise<void> {
  await walk({
    path,
    fileCallback: abspath => fs.unlink(abspath),
    dirFilter: async () => true,
    afterAll: abspath => fs.rmdir(abspath)
  });
}

class HaltWalk extends Error {
  constructor() {
    super(HaltWalk.name);
    this.name = HaltWalk.name;
  }
}

export async function isEmpty(path: string): Promise<boolean> {
  try {
    await walk({
      path,
      fileCallback: async () => { throw new HaltWalk(); }
    });
    return true;
  }
  catch (err) {
    if (err.name === HaltWalk.name) {
      return false;
    }
    else throw err;
  }
}

export enum GitStatus {
  unchanged,
  modified,
  added,
  deleted
}

export class Repository implements IRepository {
  public readonly _id: string = null;
  public name: string = null;
  public readonly userIds: string[] = null;

  // Calculated fields.
  public readonly serverDir: string;
  public readonly refresh$ = new EventEmitter<void>();

  private _gitStatus: GitStatus = GitStatus.unchanged;
  public get gitStatus(): GitStatus {
    return this._gitStatus;
  }

  public get dir(): string {
    return urlJoin('/', this.name);
  }

  constructor(obj: IRepository) {
    if (!obj) return;
    copyIfExists(obj, this);
    this.userIds = this.userIds || [];

    if (this._id) {
      this.serverDir = this._id.slice(0, 2) + '/' + this._id;
    }
    else {
      this.serverDir = null;
    }
  }

  private async tryResolveRef(ref: string): Promise<string> {
    try {
      return await resolveRef({dir: this.dir, ref})
    }
    catch (err) {
      console.error(`An error occured while resolving ref '${ref}'.`);
      console.error(err);
      return null;
    }
  }

  public async isModified(): Promise<boolean> {
    const local = await this.tryResolveRef('master');
    const remote = await this.tryResolveRef('origin/master');
    return local !== remote;
  }

  public async setStatusIfModified(): Promise<void> {
    if (await this.isModified()) {
      this._gitStatus = GitStatus.modified;
    }
  }

  public async setStatusIfUnmodified(): Promise<void> {
    if (!(await this.isModified())) {
      this._gitStatus = GitStatus.unchanged;
    }
  }

  public static async addLocalRepos(repos: Repository[]): Promise<Repository[]> {
    const stats = await lsStats('/');
    for (let name in stats) {
      if (stats[name].isDirectory()) {
        if (repos.findIndex(r => r.name === name) < 0) {
          const repo = new Repository({name});
          repo._gitStatus = GitStatus.deleted;
          repos.push(repo);
        }
      }
    }
    return repos;
  }

  public absolutePath(subpath: string): string {
    if (isAbsolute(subpath)) return subpath;
    else return urlJoin(this.dir, subpath);
  }

  public relativePath(path: string): string {
    if (isAbsolute(path)) return stripHead(path, this.dir);
    else return path;
  }

  private async _mkdir(path: string, doRefresh: boolean): Promise<void> {
    await fs.mkdir(this.absolutePath(path));
    if (doRefresh) this.refresh$.next();
  }

  public mkdir(path?: string): Promise<void> {
    return this._mkdir(path ? path : this.dir, true);
  }

  public static isUndeleted(status: string): boolean {
    return '*undeleted' === status;
  }

  public static isModifiedOrAdded(status: string): boolean {
    return '*added' === status || 'added' === status
      || '*modified' === status || 'modified' === status;
  }

  public async remove(filepath: string): Promise<void> {
    await gitRemove({
      dir: this.dir,
      filepath: this.relativePath(filepath) 
    });
    this.refresh$.next();
  }

  public async add(filepath: string): Promise<void> {
    await gitAdd({
      dir: this.dir,
      filepath: this.relativePath(filepath) 
    });
    this.refresh$.next();
  }

  public async status(path: string): Promise<string> {
    const filepath = this.relativePath(path);
    const abspath = this.absolutePath(filepath);
    if (await isdir(abspath)) {
      throw new Error(`Can\'t get the git status of a directory (abspath = '${abspath}').`);
    }
    return gitStatus({
      dir: this.dir,
      filepath
    });
  }

  public async echoTo(filepath: string, text: string, truncate?: boolean): Promise<void> {
    await echo(this.absolutePath(filepath), text, truncate);
    this.refresh$.next();
  }

  private async _mvFile(oldPath: string, newPath: string, doRefresh: boolean): Promise<void> {
    oldPath = this.absolutePath(oldPath);
    newPath = this.absolutePath(newPath);
    if (!await isfile(oldPath)) {
      throw new Error(`_mvFile was called on a non-file: '${oldPath}'`);
    }

    await mv(oldPath, newPath);
    await gitRemove({
      dir: this.dir,
      filepath: this.relativePath(oldPath)
    });
    await gitAdd({
      dir: this.dir,
      filepath: this.relativePath(newPath)
    });

    if (doRefresh) this.refresh$.next();
  }

  public mvFile(oldPath: string, newPath: string): Promise<void> {
    return this._mvFile(oldPath, newPath, true);
  }

  public async touch(path: string): Promise<void> {
    await touch(this.absolutePath(path));
    await gitAdd({
      dir: this.dir,
      filepath: this.relativePath(path)
    });
    this.refresh$.next();
  }

  private async _rm(path: string, doRefresh: boolean): Promise<void> {
    path = this.absolutePath(path);
    if (!await isfile(path)) {
      throw new Error(`_rm was called on a non-file: '${path}'`);
    }

    await gitRemove({
      dir: this.dir,
      filepath: this.relativePath(path)
    });
    await rm(path);
    if (doRefresh) this.refresh$.next();
  }

  public rm(path: string): Promise<void> {
    return this._rm(path, true);
  }

  public async mvDir(oldPath: string, newPath: string, doRefresh?: boolean): Promise<void> {
    if (undefined === doRefresh) doRefresh = true;

    oldPath = this.absolutePath(oldPath);
    newPath = this.absolutePath(newPath);
    if (!await isdir(oldPath)) {
      throw new Error(`mvDir was called on a non-directory: '${oldPath}'`);
    }
    
    const translatePath = abspath => urlJoin(newPath, stripHead(abspath, oldPath));
    await this._mkdir(newPath, false);
    await walk({
      path: oldPath,
      fileCallback: async abspath => {
        return this._mvFile(abspath, translatePath(abspath), false);
      },
      dirFilter: async abspath => {
        await this._mkdir(translatePath(abspath), false);
        return true;
      },
      afterAll: async abspath => {
        return rmdir(abspath);
      }
    });
    if (doRefresh) this.refresh$.next();
  }

  public async rmAll(path: string): Promise<void> {
    await walk({
      path,
      fileCallback: abspath => this._rm(abspath, false),
      dirFilter: async () => true,
      afterAll: abspath => rmdir(abspath)
    });
    this.refresh$.next();
  }

  public toJSON(): Object {
    return {
      _id: this._id,
      name: this.name,
      userIds: this.userIds
    };
  }
}

export class PushError extends Error {
  constructor(message: string, public readonly errors: PushResponse) {
    super(message);
  }
}

export class CommitConflict extends Error {
  constructor(message: string) {
    super(message);
    this.name = CommitConflict.name;
  }
}

@Injectable({
  providedIn: 'root'
})
export class RepoService extends BaseService {
  protected get endpoint(): string {
    return 'git';
  }

  constructor(
    private readonly http: HttpClient,
    private readonly userService: RemoteUserService
  ) {
    super();
  }

  public list(): Observable<Repository[]> {
    return this.http.get<IRepository[]>(this.getUrl('/db'))
    .pipe(map(irepos => irepos.map(irepo => new Repository(irepo))));
  }

  public get(name: string): Observable<Repository> {
    return this.http.get<IRepository>(this.getUrl('/db/' + name))
    .pipe(map(irepo => irepo ? new Repository(irepo) : null));
  }NewDir

  public upsert(repo: Repository): Observable<Repository> {
    return this.http.put<IRepository>(this.getUrl('/db'), repo)
    .pipe(map(irepo => irepo ? new Repository(irepo) : null));
  }

  private static syncIndexAndWorkingTree(repo: Repository): Promise<void> {
    return walk({
      path: repo.dir,
      fileCallback: async abspath => {
        const status = await repo.status(abspath);
        if (Repository.isUndeleted(status)) {
          return rm(abspath);
        }
        else if (Repository.isModifiedOrAdded(status)) {
          return gitAdd({
            dir: repo.dir,
            filepath: repo.relativePath(abspath)
          });
        }
      },
      dirFilter: async abspath => {
        if ('.git' === repo.relativePath(abspath)) return false;
        else return true;
      }
    });
  }

  public async fetch(repo: Repository): Promise<void> {
    if (await exists(repo.dir)) {
      try {
        await gitFetch({dir: repo.dir});
      }
      catch (err) {
        if (err.name === 'ExpandRefError') {
          // It appears that the repository has no commits
          // on the master branch. This is the case if the
          // repository is empty.
          return;
        }
        else {
          throw err;
        }
      }
      repo.setStatusIfModified();
    }
    else {
      await repo.mkdir();
      await gitClone({
        dir: repo.dir,
        url: this.getFullUrl(urlJoin('repos', repo.serverDir)),
        ref: 'master',
        singleBranch: true
      });
    }
    repo.refresh$.next();
  }

  public async commit(repo: Repository, message?: string): Promise<void> {
    await this.fetch(repo);
    // TODO: Properly handle commit conflicts.
    if (repo.gitStatus !== GitStatus.unchanged) {
      throw new CommitConflict(
        `The repository ${repo.name} has been modified. You must checkout these modification before commiting your changes.`
      );
    }
    await RepoService.syncIndexAndWorkingTree(repo);
    await gitCommit({
      dir: repo.dir,
      message: message ? message : 'Commited from the banx application.',
      author: {
        name: this.userService.remoteUser.glid,
        email: this.userService.remoteUser.email()
      }
    });
    const response = await gitPush({
      dir: repo.dir
    });
    if (response.ok && response.ok.length > 0 && response.ok[0] === 'unpack') {
      repo.refresh$.next();
      return;
    }
    else {
      throw new PushError('The push response did not indicate success.', response);
    }
  }

  public async checkout(repo: Repository): Promise<void> {
    await gitMerge({
      dir: repo.dir,
      theirs: 'origin/master',
      ours: 'master'
    });
    await gitCheckout({
      dir: repo.dir,
      ref: 'master'
    });
    await repo.setStatusIfUnmodified();
    repo.refresh$.next();
  }

  public async delete(repo: Repository): Promise<boolean> {
    const wasPresent: boolean = await new Promise((resolve, reject) => {
      this.http.delete<boolean>(this.getUrl(urlJoin('db', repo.name)))
        .subscribe(
          wasPresent => resolve(wasPresent),
          err => reject(err)
        );
    });
    if (await exists(repo.dir)) {
      await rmAll(repo.dir);
    }
    return wasPresent;
  }
}
