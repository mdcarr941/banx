import * as express from 'express';
import * as nodemailer from 'nodemailer';

import { GlobalRepoPromise, ProblemRepo } from '../problemRepo';
import { makePairs } from '../common';
import { GlobalProblemGenerator } from '../problemGenerator';
import { Problem, IProblem } from '../schema';

const router = express.Router();

const smtpUser = 'mdcarr@ufl.edu';
const smtpPass = '#37Roomtobreath73#';
const emailRecipient = 'mdcarr@ufl.edu';
const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // office365 uses STARTTLS
    requireTLS: true, // if STARTTLS is not used, don't send messages
    auth: {
        user: smtpUser,
        pass: smtpPass
    }
}, {
    // Default Message Fields
    from: `Banx <${smtpUser}>`,
    to: emailRecipient,
    subject: 'Banx Test',
    text: 'Sent from the Banx app.'
});

function printError(message: string, err?: Error) {
    console.error(`API controller: ${message}${err ? ':' : ''}`);
    if (err) console.error(err);
}

const getRepo = (() => {
    let repo: ProblemRepo;
    return async () => {
        if (repo) return repo;
        try {
            return await GlobalRepoPromise;
        } catch(err) {
            printError('failed to get the problem repository.', err);
            throw err;
        }
    }
})();

async function useRepo(
    res: express.Response, success: (repo: ProblemRepo) => any
) {
    try {
        success(await getRepo());
    } catch {
        res.sendStatus(500);
    }
}

router.get('/problem/:problemId', (req, res) => {
    useRepo(res, repo => {
        repo.getProblem(req.params['problemId'])
            .then(problem => res.send(problem))
            .catch(err => {
                printError('getProblem rejected its promise', err);
                res.sendStatus(500)
            });
        });
});

router.post('/problems', (req, res) => {
    useRepo(res, repo => {
        repo.getProblems(req.body)
            .toArray((err, problems) => {
                if (err) {
                    printError('getProblems.toArray() threw an error', err);
                    res.sendStatus(500);
                }
                else res.send(problems)
            });
    });
});

router.get('/problems', (req, res) => {
    useRepo(res, repo => {
        let tags = req.query.tags;
        if (!(req.query.tags instanceof Array)) tags = [tags];
        const query = makePairs(tags);
        repo.find(query).toArray((err, problems) => {
            if (err) {
                printError('find.toArray() threw an error', err);
                res.sendStatus(500);
            }
            else res.send(problems);
        });
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
            });
    } else {
        res.sendStatus(400);
    }
});

router.post('/submission', (req, res) => {
    const problems: Problem[] = req.body.map((p: IProblem) => new Problem(p));
    const content = problems.map(p => p.toString()).join('\n');
    transporter.sendMail({
        attachments: [{
            filename: 'submission.tex',
            content: content
        }]
    })
    .then(info => res.send({info: info}))
    .catch(() => res.sendStatus(500));
});

export default router;