import * as express from 'express';
import * as nodemailer from 'nodemailer';
import { ObjectID } from 'mongodb';

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
    const ids: string[] = req.body;
    const oids = ids.map(id => ObjectID.createFromHexString(id));
    req.banxContext.problemRepo.getProblems(oids).toArray()
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
    if (!req.banxContext.remoteUser.canEdit()) {
        res.sendStatus(403);
        return;
    }

    const problem = new Problem(req.body);
    // The client doesn't know anything about Mongo ObjectIDs, so we
    // have to create one from its hex representation.
    problem._id = ObjectID.createFromHexString(problem.idStr);
    req.banxContext.problemRepo.upsertProblem(problem)
    .then(newProblem => res.send(newProblem))
    .catch(err => {
        printError(err, 'an error occured while called upsertProblem');
        next(err);
    });
});

// A DELETE to a problem id deletes that problem.
router.delete(`/:problemId(${problemIdRgx})`, async (req, res, next) => {
    if (!req.banxContext.remoteUser.canEdit()) {
        res.sendStatus(403);
        return;
    }

    const id = ObjectID.createFromHexString(req.params['problemId']);
    req.banxContext.problemRepo.deleteOne(id)
    .then(deletedProblem => res.send(deletedProblem))
    .catch(err => {
        printError(err, 'an error occured while calling deleteOne');
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

// A post to `create` creates a new problem.
router.post('/create', (req, res, next) => {
    const iproblem = <IProblem>req.body;
    // The request must have a `content` and a `tags` entry but must
    // have neither an `idStr` nor an `_id` entry.
    if (!iproblem.content || !iproblem.tags || iproblem.idStr || iproblem._id) {
        res.sendStatus(400)
    }
    req.banxContext.problemRepo.insertOne(new Problem(iproblem))
    .then(problem => res.send(problem))
    .catch(err => {
        printError(err, 'Failed to create a new problem.');
        next(err);
    })
});

router.get('/listTagValues/:tagKey', (req, res, next) => {
    const tagKey: string = req.params['tagKey'];

    req.banxContext.problemRepo.getAllValues(tagKey)
    .then(values => res.send(values))
    .catch(err => {
        printError(err, `An error occured while getting values for the tag ${tagKey}`);
        next(err);
    })
});

export default router;