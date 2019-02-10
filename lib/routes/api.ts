import * as express from 'express';

import { GlobalRepoPromise, ProblemRepo } from '../problemRepo';
import { makePairs } from '../common';

const router = express.Router();

let repo: ProblemRepo;
async function init() {
    repo = await GlobalRepoPromise;
}

router.get('/problems', (req, res) => {
    let tags = req.query.tags;
    if (!(req.query.tags instanceof Array)) tags = [tags];
    const query = makePairs(tags);
    repo.find(query).toArray((err, problems) => {
        if (err) throw err;
        else res.send(problems);
    });
});

init().catch(err => {
    console.error('Failed to initialize the API.');
    throw err;
});

export default router;
    