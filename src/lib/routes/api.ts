import * as express from 'express';
import * as nodemailer from 'nodemailer';

import { ProblemRepo } from '../problemRepo';
import { UserRepo }from '../userRepo';
import { getGlid, makePairs, printError as commonPrintError } from '../common';
import { GlobalProblemGenerator } from '../problemGenerator';
import { Problem, IProblem, BanxUser } from '../schema';
import config from '../config';
import { NonExistantCollectionError } from 'dbClient';

class UnauthorizedError extends Error {}

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

const getRepo = (() => {
    let repo: ProblemRepo;
    return async () => {
        if (repo) return repo;
        try {
            return await ProblemRepo.create();
        } catch(err) {
            printError(err, 'failed to get the problem repository');
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
                printError(err, 'getProblem rejected its promise');
                res.sendStatus(500)
            });
        });
});

router.post('/problems', (req, res) => {
    useRepo(res, repo => {
        repo.getProblems(req.body)
            .toArray((err, problems) => {
                if (err) {
                    printError(err, 'getProblems.toArray() threw an error');
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
                printError(err, 'find.toArray() threw an error');
                res.sendStatus(500);
            }
            else res.send(problems);
        });
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

async function respondIfAdmin(req: any, res: any, next: any): Promise<UserRepo> {
    let userRepo: UserRepo;
    try {
        userRepo = await UserRepo.create();
    }
    catch (err) {
        next(err);
        throw new Error('failed to create a user repository. ' + err.message);
    }

    const glid = getGlid(req);
    let user;
    try {
        user = await userRepo.get(glid);
    }
    catch (err) {
        res.sendStatus(403);
        throw new Error(`couldn't find user with glid '${glid}' ` + err.message);
    }

    if (!user.isAdmin) {
        res.sendStatus(403);
        throw new UnauthorizedError();
    }
    return userRepo;
}

router.get('/users', (req, res, next) => {
    respondIfAdmin(req, res, next)
    .then(userRepo => {
        userRepo.list().toArray()
        .then(users => res.send(users))
        .catch(err => {
            printError(err, 'failed to list users');
            next(err);
        });
    })
    .catch(err => printError(err));
});

router.post('/users', (req, res, next) => {
    const newUser = new BanxUser(req.body);
    if (!newUser.glid || newUser.glid.length == 0) {
        res.sendStatus(400);
        return;
    }
    respondIfAdmin(req, res, next)
    .then(userRepo => {
        userRepo.insert(newUser)
        .then(result => {
            newUser._id = result.insertedId;
            res.send(newUser);
        })
        .catch(err => {
            printError(err, `failed to insert user with glid '${newUser.glid}'`);
            next(err);
        })
    })
    .catch(err => printError(err));
});

router.delete('/users/:glid', (req, res, next) => {
    const glid: string = req.params['glid'];
    if (!glid || glid.length == 0) {
        res.sendStatus(400);
        return;
    }
    respondIfAdmin(req, res, next)
    .then(userRepo => {
        userRepo.del(glid)
        .then(deleteSucceeded => res.send({deleteSucceeded: deleteSucceeded}))
        .catch(err => {
            printError(err, `failed to delete user with glid '${glid}'`);
            next(err);
        })
    })
    .catch(err => printError(err));
});

export default router;