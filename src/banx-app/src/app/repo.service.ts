import { Injectable, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import FS, { Stat } from '@isomorphic-git/lightning-fs';
import {
  clone as gitClone,
  plugins as gitPlugins,
  pull as gitPull
} from 'isomorphic-git';

import { BaseService } from './base.service';
import { IRepository } from '../../../lib/schema';
import { forEach, urlJoin } from '../../../lib/common';
import { map } from 'rxjs/operators';

const fs = (function() {
  const _fs = new FS('banxFS');
  gitPlugins.set('fs', _fs);
  return _fs.promises;
})();

// TODO: Remove the following line. (it was used for debugging)
(window as any).fs = fs;

function copyIfExists(from: any, to: any): void {
  forEach(from, (key, val) => {
    if (undefined !== to[key]) to[key] = val;
  });
}

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

export class Repository implements IRepository {
  public readonly _id: string = null;
  public name: string = null;
  public readonly userIds: string[] = null;

  // Calculated fields.
  public readonly dir: string;
  public readonly serverDir: string;
  public readonly refreshed$ = new EventEmitter<void>();

  constructor(obj: IRepository) {
    if (!obj) return;
    copyIfExists(obj, this);
    this.userIds = this.userIds || [];

    this.dir = urlJoin('/', this.name);
    this.serverDir = this._id.slice(0, 2) + '/' + this._id;
  }

  public async mkdir(): Promise<void> {
    if (await exists(this.dir)) throw new Error(
      `Cannot initialize the repository named '${this.name}' because '${this.dir}' already exists.`
    );
    await fs.mkdir(this.dir);
  }
}

@Injectable({
  providedIn: 'root'
})
export class RepoService extends BaseService {
  protected get endpoint(): string {
    return 'git';
  }

  constructor(private readonly http: HttpClient) {
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

  public async updateFromServer(repo: Repository): Promise<void> {
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
    repo.refreshed$.next();
  }
}
