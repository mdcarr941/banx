import * as express from 'express';

import { ProblemRepo, getGlobalProblemRepo } from '../problemRepo';
import { printError as commonPrintError, urlJoin } from '../common';
import config from '../config';

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

  let topics: string[];
  try {
    topics = await problemRepo.getAllValues('Topic');
  }
  catch (err) {
    printError(err, 'Failed to find all topics.');
    next(err);
    return;
  }

  res.render('index', {
    title: 'Banx',
    topicsStr: JSON.stringify(topics),
    remoteUser: JSON.stringify(req.banxContext.remoteUser),
    baseHref: urlJoin('/', config.banxPrefix, 'app'),
  });
});

// We get the repository right when the app starts so that the first
// request is not slowed down by its creation.
getGlobalProblemRepo()
.then(() => console.log(`index: Now connected to the database at ${config.mongoUri}.`))
.catch(err => printError(err, 'Failed to get repositories'));

export default router;
