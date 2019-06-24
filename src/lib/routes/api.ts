import * as express from 'express';
import * as nodemailer from 'nodemailer';

import { ProblemRepo, getGlobalProblemRepo } from '../problemRepo';
import { UserRepo, getGlobalUserRepo }from '../userRepo';
import { makePairs, printError as commonPrintError } from '../common';
import { GlobalProblemGenerator } from '../problemGenerator';
import { Problem, IProblem, BanxUser, UserRoleInverse } from '../schema';
import { getGlid } from '../app';
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

async function respondIfAdmin(req: any, res: any, next: any): Promise<UserRepo> {
    let userRepo: UserRepo;
    try {
        userRepo = await getGlobalUserRepo();
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
        throw new Error(`user ${glid} is not an admin`);
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

function getGlidParam(req: any, res: any): string {
    const glid: string = req.params['glid'];
    if (!glid || glid.length == 0) {
        res.sendStatus(400);
        return null;
    }
    return glid;
}

router.delete('/users/:glid', (req, res, next) => {
    const glid = getGlidParam(req, res);
    if (!glid) return;
    respondIfAdmin(req, res, next)
    .then(userRepo => {
        return userRepo.get(glid)
        .then(user => {
            if (user.isAdmin()) {
                res.sendStatus(403);
                throw new Error('An attempt was made to delete an admin.');
            }
            return userRepo;
        })
    })
    .then(userRepo => {
        userRepo.del(glid)
        .then(deleteSucceeded => res.send({deleteSucceeded: deleteSucceeded}))
        .catch(err => {
            printError(err, `failed to delete user with glid '${glid}'`);
            next(err);
        });
    })
    .catch(err => printError(err));
});

router.post('/users/:glid', (req, res, next) => {
    const glid = getGlidParam(req, res);
    if (!glid) return;
    respondIfAdmin(req, res, next)
    .then(userRepo => {
        return userRepo.get(glid)
        .then(user => {
            if (user.isAdmin()) {
                res.sendStatus(403);
                throw new Error('An attempt was made to modify an Admin\'s roles.');
            }
            return userRepo;
        })
    })
    .then(userRepo => {
        userRepo.setRoles(glid, req.body.map((roleName: string) => UserRoleInverse[roleName]))
        .then(result => res.send({result: result}))
        .catch(err => {
            printError(err, `Failed to set roles on user ${glid}`);
            next(err);
        })
    })
    .catch(err => printError(err));
});

export default router;