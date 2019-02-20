import * as express from 'express';
import { ObjectID } from 'mongodb';

import { GlobalRepoPromise, ProblemRepo } from '../problemRepo';
import { makePairs } from '../common';
import { GlobalProblemGenerator } from '../problemGenerator';

const router = express.Router();

let repo: ProblemRepo;
async function init() {
    repo = await GlobalRepoPromise;
}

router.get('/problem/:problemId', (req, res) => {
    repo.getProblem(req.params['problemId'])
        .then(problem => res.send(problem))
        .catch(() => res.sendStatus(404));
});

router.post('/problems', (req, res) => {
    repo.getProblems(req.body.map((id: string) => ObjectID.createFromHexString(id)))
        .toArray((err, problems) => {
            if (err) res.sendStatus(500);
            else res.send(problems)
        });
});

router.get('/problems', (req, res) => {
    let tags = req.query.tags;
    if (!(req.query.tags instanceof Array)) tags = [tags];
    const query = makePairs(tags);
    repo.find(query).toArray((err, problems) => {
        if (err) throw err;
        else res.send(problems);
    });
});

router.get('/instance/:problemId', (req, res) => {
    GlobalProblemGenerator.getInstance(req.params['problemId'])
        .then(problem => res.send(problem))
        .catch(() => res.sendStatus(400));
});

init().catch(err => {
    console.error('Failed to initialize the API.');
    throw err;
});

export default router;
    