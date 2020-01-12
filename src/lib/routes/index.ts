import * as express from 'express';
import { promises as fs } from 'fs';
import { join as pathJoin } from 'path';

import { ProblemRepo, getGlobalProblemRepo } from '../problemRepo';
import { printError as commonPrintError, urlJoin } from '../common';
import config from '../config';

const jsFiles: string[] = [];
let styleFile: string;

(async function() {
  let main: string = null;
  const dir = 'public/banx-app'
  const translatePath = (file: string) => pathJoin('.', dir, file);
  const files = await fs.readdir(dir);
  for (let file of files) {
    if (file.endsWith('.js')) {
      if (file.startsWith('runtime')
        || file.startsWith('polyfills')
        || file.startsWith('es2015-polyfills')
        || file.startsWith('styles')
        || file.startsWith('vendor')) {
        jsFiles.push(translatePath(file));
      }
      else if (file.startsWith('main')) main = translatePath(file);
    }
    else if (file.endsWith('.css')) {
      if (file.startsWith('styles')) {
        styleFile = translatePath(file);
      }
    }
  }
  // The main file needs to come last.
  if (main) jsFiles.push(main);
})();

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
    jsFiles,
    styleFile
  });
});

// We get the repository right when the app starts so that the first
// request is not slowed down by its creation.
getGlobalProblemRepo()
.then(() => console.log(`index: Now connected to the database at ${config.mongoUri}.`))
.catch(err => printError(err, 'Failed to get repositories'));

export default router;
