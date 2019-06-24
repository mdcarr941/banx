import * as express from 'express';
import * as nodemailer from 'nodemailer';

import { ProblemRepo, getGlobalProblemRepo } from '../problemRepo';
import { makePairs, printError as commonPrintError } from '../common';
import { GlobalProblemGenerator } from '../problemGenerator';
import { Problem, IProblem } from '../schema';
import config from '../config';

const router = express.Router();

const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // office365 uses STARTTLS
    requireTLS: true, // if STARTTLS is not used, don't send messages
    auth: {
        user: config.smtpUser,
        pass: config.smtpPass
    }
}, {
    // Default Message Fields
    from: `Banx <${config.smtpUser}>`,
    to: config.emailRecipient,
    subject: 'Banx Test',
    text: 'Sent from the Banx app.'
});

function printError(err: Error, message?: string) {
    if (!message) message = '';
    message = 'API controller: ' + message;
    commonPrintError(err, message);
}

async function getProblemRepo(next: Function): Promise<ProblemRepo> {
    try {
        return await getGlobalProblemRepo();
    }
    catch (err) {
        next(err);
    }
}

router.get('/problem/:problemId', async (req, res, next) => {
    const repo = await getProblemRepo(next);
    repo.getProblem(req.params['problemId'])
    .then(problem => res.send(problem))
    .catch(err => {
        printError(err, 'getProblem rejected its promise');
        next(err);
    });
});

router.post('/problems', async (req, res, next) => {
    const repo = await getProblemRepo(next);
    repo.getProblems(req.body).toArray()
    .then(problems => res.send(problems))
    .catch(err => {
        printError(err, 'getProblems.toArray() threw an error');
        next(err);
    });
});

router.get('/problems', async (req, res, next) => {
    const repo = await getProblemRepo(next);
    let tags = req.query.tags;
    if (!(tags instanceof Array)) tags = [tags];
    const query = makePairs(tags);
    repo.find(query).toArray()
    .then(problems => res.send(problems))
    .catch(err => {
        printError(err, 'find.toArray() threw an error');
        next(err);
    });
});

router.get('/instance/:problemId', (req, res, next) => {
    const problemId: string = req.params['problemId'];
    const numInstances: number = req.query.numInstances;
    if (numInstances == 1) {
        GlobalProblemGenerator.getInstance(problemId)
        .then(problem => res.send(problem))
        .catch(err => {
            printError(err, `an error occured while calling getInstance(${problemId})`);
            next(err);
        });
    } else if (numInstances > 1) {
        GlobalProblemGenerator.getInstances(problemId, numInstances)
        .then(instances => res.send(instances))
        .catch(err => {
            printError(err, `an error occured while calling getInstances(${problemId}, ${numInstances})`);
            next(err);
        });
    } else {
        res.sendStatus(400);
    }
});

router.post('/submission', (req, res, next) => {
    const problems: Problem[] = req.body.map((p: IProblem) => new Problem(p));
    const content = problems.map(p => p.toString()).join('\n');
    transporter.sendMail({
        attachments: [{
            filename: 'submission.tex',
            content: content
        }]
    })
    .then(info => res.send({info: info}))
    .catch(err => {
        printError(err, 'sendMail failed');
        next(err);
    });
});

export default router;