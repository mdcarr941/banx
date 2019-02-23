import * as express from 'express';
import * as fs from 'fs';
import * as nodemailer from 'nodemailer';

import { GlobalRepoPromise, ProblemRepo } from '../problemRepo';
import { makePairs } from '../common';
import { GlobalProblemGenerator } from '../problemGenerator';
import { Problem, IProblem } from '../schema';

const router = express.Router();

const smtpUser = 'mdcarr@ufl.edu';
const smtpPass = '#37Roomtobreath73#';
const emailRecipient = 'mdcarr@ufl.edu';

let repo: ProblemRepo;
let transporter: nodemailer.Transporter;
function init() {
    transporter = nodemailer.createTransport({
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
    return GlobalRepoPromise.then(r => repo = r);
        // nodemailer.createTestAccount()
        //     .then(account => {
        //         transporter = nodemailer.createTransport({
        //             host: 'smtp.ethereal.email',
        //             port: 587,
        //             secure: false,
        //             auth: {
        //                 user: account.user,
        //                 pass: account.pass
        //             }
        //         });
        //     })
    //]);
}

function printError(message: string, err?: Error) {
    console.error(`API controller: ${message}${err ? ':' : ''}`);
    if (err) console.error(err);
}

router.get('/problem/:problemId', (req, res) => {
    repo.getProblem(req.params['problemId'])
        .then(problem => res.send(problem))
        .catch(err => {
            printError('getProblem rejected its promise', err);
            res.sendStatus(404)
        });
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
        if (err) {
            printError('find.toArray() threw an error', err);
            res.sendStatus(500);
        }
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

router.post('/submission', (req, res) => {
    const problems: Problem[] = req.body.map((p: IProblem) => new Problem(p));
    const content = problems.map(p => p.toString()).join('\n');
    transporter.sendMail({
        attachments: [{
            filename: 'submission.tex',
            content: content
        }]
    })
    .then(info => {
        console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
        res.send({info: info});
    })
    .catch(error => res.status(500).send({error: error}));
});

init().catch(err => {
    console.error('Failed to initialize the API.');
    throw err;
});

export default router;