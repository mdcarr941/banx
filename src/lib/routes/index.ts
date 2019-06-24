import * as express from 'express';

import { ProblemRepo, getGlobalProblemRepo } from '../problemRepo';
import { printError as commonPrintError, urlJoin } from '../common';
import config from '../config';
import { ProblemIndex } from 'schema';

const router = express.Router();

function printError(err: Error, message?: string) {
  if (!message) message = '';
  message = 'index: ' + message;
  commonPrintError(err, message);
}

router.get('*', async (req, res, next) => {
  let problemRepo: ProblemRepo;
  try {
    problemRepo = await getGlobalProblemRepo();
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

  res.render('index', {
    title: 'Banx',
    problemIndexStr: JSON.stringify(problemIndex),
    userGlid: req.banxContext.remoteUser.glid,
    isAdmin: req.banxContext.remoteUser.isAdmin(),
    baseHref: urlJoin('/', config.banxPrefix, 'app'),
  });
});

// We get the repository right when the app starts so that the first
// request is not slowed down by their creation.
getGlobalProblemRepo()
.then(() => console.log('index: Now connected to the database.'))
.catch(err => printError(err, 'Failed to get repositories'));

export default router;
