import * as express from 'express';

import { ProblemRepo, getGlobalProblemRepo } from '../problemRepo';
import { printError as commonPrintError, urlJoin, getGlid } from '../common';
import { UnknownUserError, UserRepo, getGlobalUserRepo } from '../userRepo';
import config from '../config';
import { ProblemIndex, BanxUser } from 'schema';

const router = express.Router();

function printError(err: Error, message?: string) {
  if (!message) message = '';
  message = 'index: ' + message;
  commonPrintError(err, message);
}

router.get('*', async (req, res, next) => {
  let problemRepo: ProblemRepo;
  let userRepo: UserRepo;
  try {
    const result = await Promise.all([getGlobalProblemRepo(), getGlobalUserRepo()])
    problemRepo = result[0];
    userRepo = result[1];
  }
  catch (err) {
    printError(err, 'Failed to get repositories')
    next(err);
    return;
  }

  let problemIndex: ProblemIndex;
  try {
    problemIndex = await problemRepo.getProblemIndex()
  }
  catch (err) {
    printError(err, 'Failed to get problem index');
    next(err);
    return;
  }

  const glid = getGlid(req);
  let user: BanxUser;
  try {
    user = await userRepo.get(glid);
  }
  catch (err) {
    if (err instanceof UnknownUserError) res.sendStatus(403);
    else {
      printError(err, `An unkown error occured while looking up user '${glid}'`);
      next(err);
    }
    return
  }

  res.render('index', {
    title: 'Banx',
    problemIndexStr: JSON.stringify(problemIndex),
    userGlid: user.glid,
    isAdmin: user.isAdmin(),
    baseHref: urlJoin('/', config.banxPrefix, 'app'),
  });
});

// We get the repositories right when the app starts so that the first
// request is not slowed down by their creation.
Promise.all([getGlobalProblemRepo(), getGlobalUserRepo()])
.then(() => console.log('index: Now connected to the database.'))
.catch(err => printError(err, 'Failed to get repositories'));

export default router;
