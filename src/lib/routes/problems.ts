import * as express from 'express';
import * as nodemailer from 'nodemailer';

import { getGlobalProblemRepo } from '../problemRepo';
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

// Load the global problem repository into the BanxContext.
router.use(async (req, res, next) => {
    try {
        req.banxContext.problemRepo = await getGlobalProblemRepo();
        next();
    }
    catch (err) {
        printError(err, 'An error occured while getting the global problem repository')
        next(err);
    }
});

// A GET to the root of this router will use the values of the
// `tags` query parameter to select problems from the database.
router.get('/', async (req, res, next) => {
    console.log('the right function was called');
    let tags = req.query.tags;
    if (!(tags instanceof Array)) tags = [tags];
    const query = makePairs(tags);
    req.banxContext.problemRepo.find(query).toArray()
    .then(problems => res.send(problems))
    .catch(err => {
        printError(err, 'find.toArray() threw an error');
        next(err);
    });
});

// A POST to the root of this router uses the array of problem
// ids in the request body to select a list of problems.
router.post('/', async (req, res, next) => {
    req.banxContext.problemRepo.getProblems(req.body).toArray()
    .then(problems => res.send(problems))
    .catch(err => {
        printError(err, 'getProblems.toArray() threw an error');
        next(err);
    });
});

const problemIdRgx = '[0-9a-fA-F]{24}';

// A GET to a problem id returns that problem.
router.get(`/:problemId(${problemIdRgx})`, async (req, res, next) => {
    req.banxContext.problemRepo.getProblem(req.params['problemId'])
    .then(problem => res.send(problem))
    .catch(err => {
        printError(err, 'getProblem rejected its promise');
        next(err);
    });
});

// A POST to a problem id modifies that problem.
router.post(`/:problemId(${problemIdRgx})`, async (req, res, next) => {
    if (!req.banxContext.remoteUser.isAuthor()) {
        res.sendStatus(403);
        return;
    }

    const problem = new Problem(req.body);
    req.banxContext.problemRepo.upsertProblem(problem)
    .then(newProblem => res.send(newProblem))
    .catch(err => {
        printError(err, 'an error occured while called upsertProblem');
        next(err);
    });
});

router.get(`/instance/:problemId(${problemIdRgx})`, (req, res, next) => {
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

router.post('/submit', (req, res, next) => {
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