import * as express from 'express';

import { ProblemRepo } from 'problemRepo';
import { BanxUser } from './schema';
import { UserRepo } from './userRepo';
import { forEach } from './common';
import { RepoRepo } from './repoRepo';

export interface BanxContext {
    remoteUser?: BanxUser;
    userRepo?: UserRepo;
    problemRepo?: ProblemRepo;
    requestedUser?: BanxUser;
    repoRepo?: RepoRepo
}
  
declare global {
    namespace Express {
        interface Request {
            banxContext: BanxContext;
        }
    }
}
  
export function getGlid(req: any): string {
    const eppn = req.headers.ufshib_eppn
    return eppn ? eppn.split('@')[0] : '';
}

export function onlyAllowAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    const user = req.banxContext.remoteUser;
    if (user && user.isAdmin()) next();
    else res.sendStatus(403);
}

export function onlyAllowAuthors(req: express.Request, res: express.Response, next: express.NextFunction) {
    const user = req.banxContext.remoteUser;
    if (user && (user.isAuthor() || user.isAdmin())) next();
    else res.sendStatus(403);
}

export function logHeaders(req: express.Request, res: express.Response, next: express.NextFunction) {
    function print(msg: string): void {
        console.log('headers| ' + msg);
    }
    print('  BEGIN');
    forEach(req.headers, (headerName, headerValue) => print(`${headerName}: ${headerValue}`));
    print('  END');
    next();
}