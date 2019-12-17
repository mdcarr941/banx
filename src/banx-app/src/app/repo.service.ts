import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import FS from '@isomorphic-git/lightning-fs';
import { clone as gitClone, plugins as gitPlugins, pull as gitPull } from 'isomorphic-git';

import { BaseService } from './base.service';
import { IRepository } from '../../../lib/schema';
import { forEach } from '../../../lib/common';
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

export async function exists(path: string): Promise<boolean> {
  return fs.stat(path).then(() => true).catch(() => false);
}

export async function ls(path: string): Promise<string[]> {
  return fs.readdir(path);
}

export class Repository implements IRepository {
  public readonly _id: string = null;
  public name: string = null;
  public readonly userIds: string[] = null;

  // Calculated fields.
  public readonly prefix: string;
  public readonly dir: string;

  constructor(obj: IRepository) {
    if (!obj) return;
    copyIfExists(obj, this);
    this.userIds = this.userIds || [];

    this.prefix = '/' + this._id.slice(0, 2);
    this.dir = this.prefix + '/' + this._id;
  }

  public async init(): Promise<void> {
    if (await exists(this.dir)) throw new Error(
      `Cannot initialize the repository named '${this.name}' because '${this.dir}' already exists.`
    );
    if (!(await exists(this.prefix))) await fs.mkdir(this.prefix);
    await fs.mkdir(this.dir);
  }
}

@Injectable({
  providedIn: 'root'
})
export class RepoService extends BaseService {
  protected get endpoint(): string {
    return 'git'
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
      await gitPull({
        dir: repo.dir
      })
    }
    else {
      await repo.init();
      await gitClone({
        dir: repo.dir,
        url: `http://localhost:3000/git/repos${repo.dir}`,
        ref: 'master',
        singleBranch: true
      });
    }
  }
}
