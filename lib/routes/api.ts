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

function printError(message: string, err?: Error) {
    console.error(`API controller: ${message}${err ? ':' : ''}`);
    if (err) console.error(err);
}

router.get('/problem/:problemId', (req, res) => {
    repo.getProblem(req.params['problemId'])
        .then(problem => res.send(problem))
        .catch(() => res.sendStatus(404));
});

router.post('/problems', (req, res) => {
    repo.getProblems(req.body)
    .toArray((err, problems) => {
        if (err) {
            printError('getProblems.toArray() threw an error', err)
            res.sendStatus(500);
        }
        else res.send(problems)
    });
});

router.get('/problems', (req, res) => {
    let tags = req.query.tags;
    if (!(req.query.tags instanceof Array)) tags = [tags];
    const query = makePairs(tags);
    repo.find(query).toArray((err, problems) => {
        if (err) res.sendStatus(500);
        else res.send(problems);
    });
});

router.get('/instance/:problemId', (req, res) => {
    const problemId: string = req.params['problemId'];
    const numInstances: number = req.query.numInstances;
    if (numInstances == 1) {
        GlobalProblemGenerator.getInstance(problemId)
            .then(problem => res.send(problem))
            .catch(err => {
                printError(`an error occured while calling getInstance(${problemId})`, err);
                res.sendStatus(500)
            });
    } else if (numInstances > 1) {
        GlobalProblemGenerator.getInstances(problemId, numInstances)
            .then(instances => res.send(instances))
            .catch(err => {
                printError(`an error occured while calling getInstances(${problemId}, ${numInstances})`, err);
                res.sendStatus(500);
            })
    } else {
        res.sendStatus(400);
    }
});

init().catch(err => {
    console.error('Failed to initialize the API.');
    throw err;
});

export default router;
    