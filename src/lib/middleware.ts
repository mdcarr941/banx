import * as express from 'express';

import { ProblemRepo } from 'problemRepo';
import { BanxUser } from './schema';
import { UserRepo } from './userRepo';

export interface BanxContext {
    remoteUser?: BanxUser;
    userRepo?: UserRepo;
    problemRepo?: ProblemRepo;
    requestedUser?: BanxUser;
}
  
declare global {
    namespace Express {
        interface Request {
            banxContext: BanxContext;
        }
    }
}
  
export function getGlid(req: any): string {
    return req.headers.ufshib_glid;
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