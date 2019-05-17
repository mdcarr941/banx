import * as express from 'express';

import { GlobalRepoPromise } from '../problemRepo';

const router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  GlobalRepoPromise
    .then(repo => {
      repo.getProblemIndex()
        .then(problemIndex => {
          res.render('index', { title: 'Banx', problemIndexStr: JSON.stringify(problemIndex) });
        })
        .catch(err => {
          console.error('Failed to get the problem index.')
          next(err);
        });
    })
    .catch(err => {
      console.error('Failed to connect to the database.');
      next(err);
    })
});

export default router;
