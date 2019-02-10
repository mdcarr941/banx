import * as express from 'express';

import { GlobalRepoPromise, ProblemRepo } from '../problemRepo';

const router = express.Router();

let repo: ProblemRepo;
async function init() {
  repo = await GlobalRepoPromise;
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Banx' });
});

init().catch(err => {
  console.error('Faled to initialize the index router.');
  throw err;
})

export default router;
