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
  PushResponse
} from 'isomorphic-git';
import { RemoteUserService } from './remote-user.service';

import { BaseService } from './base.service';
import { IRepository } from '../../../lib/schema';
import { forEach, urlJoin, stripHead, isAbsolute } from '../../../lib/common';

// TODO: remove the following assignment. It was added during debugging.
(window as any).git = Object.freeze({
  status: gitStatus
});

const fs = (function() {
  const _fs = new FS('banxFS');
  gitPlugins.set('fs', _fs);
  return _fs.promises;
})();

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
  if (truncate) await fs.unlink(path);
  return fs.writeFile(path, text, {encoding: stringEncoding});
}

export function isdir(path: string): Promise<boolean> {
  return fs.stat(path)
    .then(stat => stat.isDirectory())
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
    if (stats[name].isDirectory() && await dirFilter(subpath)) {
      promises.push(_walk({ path: subpath, fileCallback, dirFilter, afterAll }));
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

export class Repository implements IRepository {
  public readonly _id: string = null;
  public name: string = null;
  public readonly userIds: string[] = null;

  // Calculated fields.
  public readonly dir: string;
  public readonly serverDir: string;
  public readonly refresh$ = new EventEmitter<void>();

  constructor(obj: IRepository) {
    if (!obj) return;
    copyIfExists(obj, this);
    this.userIds = this.userIds || [];

    this.dir = urlJoin('/', this.name);
    this.serverDir = this._id.slice(0, 2) + '/' + this._id;
  }

  public absolutePath(subpath: string): string {
    if (isAbsolute(subpath)) return subpath;
    else return urlJoin(this.dir, subpath);
  }

  public relativePath(path: string): string {
    if (isAbsolute(path)) return stripHead(path, this.dir);
    else return path;
  }

  public async mkdir(path?: string): Promise<void> {
    path = path ? path : this.dir;
    await fs.mkdir(this.absolutePath(path));
    this.refresh$.next();
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
      throw new Error(`Can\'t get the git status of a directory. abspath = '${abspath}'`);
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

  public async mv(oldPath: string, newPath: string): Promise<void> {
    await mv(this.absolutePath(oldPath), this.absolutePath(newPath));
    await gitRemove({
      dir: this.dir,
      filepath: this.relativePath(oldPath)
    });
    await gitAdd({
      dir: this.dir,
      filepath: this.relativePath(newPath)
    });
    this.refresh$.next();
  }

  public async touch(path: string): Promise<void> {
    await touch(this.absolutePath(path));
    await gitAdd({
      dir: this.dir,
      filepath: this.relativePath(path)
    });
    this.refresh$.next();
  }
}

export class PushError extends Error {
  constructor(message: string, public readonly errors: PushResponse) {
    super(message);
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
  }

  public upsert(repo: Repository): Observable<Repository> {
    return this.http.put<IRepository>(this.getUrl('/db'), repo)
    .pipe(map(irepo => irepo ? new Repository(irepo) : null));
  }

  private static syncIndexAndWorkingTree(repo: Repository): Promise<void> {
    return walk({
      path: repo.dir,
      fileCallback: async abspath => {
        const status = await repo.status(abspath);
        if ('*undeleted' === status) {
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
      },
      afterAll: async abspath => {
        if ('*undeleted' === await repo.status(abspath)) {
          await rmAll(abspath);
        }
      }
    });
  }

  public async pull(repo: Repository): Promise<void> {
    if (await exists(repo.dir)) {
      try {
        await gitPull({
          dir: repo.dir,
          ref: 'master'
        });
      }
      catch (err) {
        if (err.name === 'ExpandRefError') {
          // It appears that the repository has no commits
          // on the master branch. This is the case if the
          // repository is empty.
          return;
        }
      }
      await RepoService.syncIndexAndWorkingTree(repo);
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
    await RepoService.syncIndexAndWorkingTree(repo);
    console.log('sync completed');
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
}
