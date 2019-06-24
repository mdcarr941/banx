import * as express from 'express';

import { UserRepo, getGlobalUserRepo }from '../userRepo';
import { BanxUser, UserRoleInverse } from '../schema';
import { getGlid } from '../app';
import { printError as commonPrintError } from '../common';

function printError(err: Error, message?: string) {
    if (!message) message = '';
    message = 'User controller: ' + message;
    commonPrintError(err, message);
}

const router = express.Router();

// Only admin users are allowed to access this router.
router.use(async (req, res, next) => {
    const user = req.banxContext.remoteUser;
    if (user.isAdmin) {
        next();
        return
    }
    else {
        res.sendStatus(403);
        printError(new Error(`user ${user.glid} is not an admin`));
    }
});

router.get('/', (req, res, next) => {
    req.banxContext.userRepo.list().toArray()
    .then(users => res.send(users))
    .catch(err => {
        printError(err, 'failed to list users');
        next(err);
    });
});

router.post('/', (req, res, next) => {
    const newUser = new BanxUser(req.body);
    if (!newUser.glid || newUser.glid.length == 0) {
        res.sendStatus(400);
        return;
    }
    req.banxContext.userRepo.insert(newUser)
    .then(result => {
        newUser._id = result.insertedId;
        res.send(newUser);
    })
    .catch(err => {
        printError(err, `failed to insert user with glid '${newUser.glid}'`);
        next(err);
    });
});

router.use('/:glid', async (req, res, next) => {
  const glid: string = req.params['glid'];
  if (!glid || glid.length == 0) {
      res.sendStatus(400);
      return;
  }

  try {
    req.banxContext.requestedUser = await req.banxContext.userRepo.get(glid);
    if (req.banxContext.requestedUser.isAdmin) {
        res.sendStatus(403);
        next(new Error('An attempt was made to modify an admin.'));
    }
  }
  catch(err) {
      printError(err);
      next(err);
  }
});

router.delete('/:glid', (req, res, next) => {
  const glid = req.banxContext.requestedUser.glid;
  req.banxContext.userRepo.del(glid)
  .then(deleteSucceeded => res.send({deleteSucceeded: deleteSucceeded}))
  .catch(err => {
      printError(err, `failed to delete user with glid '${glid}'`);
      next(err);
  });
});

router.post('/:glid', (req, res, next) => {
    const glid = req.banxContext.remoteUser.glid;
    req.banxContext.userRepo.setRoles(glid, req.body.map((roleName: string) => UserRoleInverse[roleName]))
    .then(result => res.send({result: result}))
    .catch(err => {
        printError(err, `Failed to set roles on user ${glid}`);
        next(err);
    })
});

export default router;
