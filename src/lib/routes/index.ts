import * as express from 'express';

import client from '../dbClient';
import { ProblemRepo } from '../problemRepo';
import { printError as commonPrintError, urlJoin, getGlid } from '../common';
import { UserRepo, UnknownUserError } from '../userRepo';
import config from '../config';

const router = express.Router();
let problemRepo: ProblemRepo = null;
let userRepo: UserRepo = null;
let repoPromise: Promise<[ProblemRepo, UserRepo]> = null;

function printError(err: Error, message?: string) {
  if (!message) message = '';
  message = 'index: ' + message;
  commonPrintError(err, message);
}

function createRepositories(): Promise<[ProblemRepo, UserRepo]> {
  if (repoPromise) return repoPromise;
  else if (!problemRepo && !userRepo) {
    repoPromise = Promise.all([ProblemRepo.create(), UserRepo.create()])
    .then(result => {
      repoPromise = null;
      problemRepo = result[0];
      userRepo = result[1];
      return result
    });
  }
  else if (!problemRepo && userRepo) {
    repoPromise = ProblemRepo.create().then(repo => {
      repoPromise = null;
      problemRepo = repo;
      return <[ProblemRepo, UserRepo]>[problemRepo, userRepo];
    });
  }
  else if (problemRepo && !userRepo) {
    repoPromise = UserRepo.create().then(repo => {
      repoPromise = null;
      userRepo = repo;
      return <[ProblemRepo, UserRepo]>[problemRepo, userRepo];
    });
  }
  return repoPromise;
}

function doResponse(problemRepo: ProblemRepo, userRepo: UserRepo, req: any, res: any, next: any) {
  problemRepo.getProblemIndex()
  .then(problemIndex => {
    const glid = getGlid(req);
    userRepo.get(glid)
    .then(user => {
      res.render('index', {
        title: 'Banx',
        problemIndexStr: JSON.stringify(problemIndex),
        userGlid: user.glid,
        isAdmin: user.isAdmin(),
        baseHref: urlJoin('/', config.banxPrefix, 'app'),
      });
    })
    .catch(err => {
      if (err instanceof UnknownUserError) res.sendStatus(403);
      else {
        printError(err, `An unkown error occured while looking up user '${glid}'`);
        userRepo = null;
        client.disconnect();
        next(err);
      }
    });
  })
  .catch(err => {
    printError(err, 'Failed to get problem index');
    problemRepo = null;
    client.disconnect();
    next(err);
  });
}

router.get('*', (req, res, next) => {
  if (problemRepo && userRepo) {
    doResponse(problemRepo, userRepo, req, res, next);
    return;
  }
  if (!repoPromise) repoPromise = createRepositories();
  repoPromise
  .then(result => doResponse(result[0], result[1], req, res, next))
  .catch(err => {
    printError(err, 'Failed to get repositories');
    next(err);
  });
});

createRepositories()
.then(() => console.log('index: Now connected to the database.'))
.catch(err => printError(err, 'Failed to get repositories'));

export default router;
