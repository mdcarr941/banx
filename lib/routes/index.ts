import * as express from 'express';

import { GlobalRepoPromise, ProblemRepo } from '../problemRepo';

const router = express.Router();

let repo: ProblemRepo;
async function init() {
  repo = await GlobalRepoPromise;
}

/* GET home page. */
router.get('/', function(req, res, next) {
  repo.getProblemIndex().then(problemIndex => {
    res.render('index', { title: 'Banx', problemIndexStr: JSON.stringify(problemIndex) });
  });
});

init().catch(err => {
  console.error('Faled to initialize the index router.');
  throw err;
})

export default router;
