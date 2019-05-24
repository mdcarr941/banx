import * as express from 'express';

import client from '../dbClient';
import { ProblemRepo } from '../problemRepo';

const router = express.Router();
let problemRepo: ProblemRepo = null;

/* GET home page. */
router.get('/', function(req, res, next) {
  if (null == problemRepo) {
    ProblemRepo.create()
      .then(repo => {
        problemRepo = repo;
        doIndexResponse(repo, req, res, next);
      })
      .catch(err => {
        console.error('index: Failed to connect to the database.');
        next(err);
      })
  }
  else doIndexResponse(problemRepo, req, res, next);
});

function doIndexResponse(repo: ProblemRepo, req: any, res: any, next: Function) {
  repo.getProblemIndex()
    .then(problemIndex => {
      res.render('index', { title: 'Banx', problemIndexStr: JSON.stringify(problemIndex), 'requestUrl': req.url });
    })
    .catch(err => {
      console.error('index: Failed to get the problem index.');
      // Disconnect from the DB and clear our cached ProblemRepo.
      client.disconnect();
      problemRepo = null; 
      next(err);
    });
}

export default router;
