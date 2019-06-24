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
    if (req.banxContext.remoteUser.isAdmin()) next();
    else res.sendStatus(403);
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

// Get the requested user from the DB and check that they are not
// an admin. Admin user are not modifiable nor deletable throught the
// web interface.
router.use('/:glid', async (req, res, next) => {
  const glid: string = req.params['glid'];
  if (!glid || glid.length == 0) {
      res.sendStatus(400);
      return;
  }

  try {
    req.banxContext.requestedUser = await req.banxContext.userRepo.get(glid);
    if (!req.banxContext.requestedUser.isAdmin()) next();
    else res.sendStatus(403);
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
    const glid = req.banxContext.requestedUser.glid;
    const roles = req.body.map((roleName: string) => UserRoleInverse[roleName]);
    req.banxContext.userRepo.setRoles(glid, roles)
    .then(result => res.send({result: result}))
    .catch(err => {
        printError(err, `Failed to set roles on user ${glid}`);
        next(err);
    })
});

export default router;
