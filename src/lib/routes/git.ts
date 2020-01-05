import * as express from 'express';
import * as url from 'url';

import { gitHttpBackend } from '../gitHttpBackend';
import { getGlobalRepoRepo, Repository } from '../repoRepo';
import { IRepository } from 'schema';

const router = express.Router();

const repoIdRgx = /[0-9a-f]{2}\/([0-9a-f]+)/i;

export async function onlyAllowRepoContributors(req: express.Request, res: express.Response, next: express.NextFunction) {
    const parsedUrl = url.parse(req.url);
    const match = repoIdRgx.exec(parsedUrl.pathname);
    if (!match) {
        next(new Error('Failed to extract a repo Id from: ' + parsedUrl.pathname));
        return;
    }

    const repoId = match[1];
    const repo = await req.banxContext.repoRepo.getByIdStr(repoId);
    if (!repo) res.sendStatus(404);
    else if (repo.isUserAuthorized(req.banxContext.remoteUser.glid)) next();
    else res.sendStatus(403);
}

// Load the global repo repository into the BanxContext.
router.use(async (req, res, next) => {
    try {
        req.banxContext.repoRepo = await getGlobalRepoRepo();
        next();
    }
    catch (err) {
        console.error('Failed to add the global RepoRepo to BanxContext.');
        console.error(err);
        next(err);
        return;
    }
});

// Get the repositories that the remote user has access to.
router.get('/db', async (req, res, next) => {
    const glid = req.banxContext.remoteUser.glid;
    let repos: Repository[];
    try {
        repos = await req.banxContext.repoRepo.getEditorsRepos(glid).toArray();
    }
    catch (err) {
        console.error(`Failed to get repositories for user ${glid}.`);
        console.error(err);
        next(err);
        return;
    }
    res.send(repos);
});

// Return information about the repo with 'name'.
// This is currently not needed.
// router.get('/db/:name', async (req, res, next) => {
//     const name: string = req.params['name'];
//     let repo: Repository;
//     try {
//         repo = await req.banxContext.repoRepo.get(name);
//     }
//     catch (err) {
//         console.error(`Failed to get the repository with the name ${name}:`);
//         console.error(err);
//         next(err);
//     }
//     res.send(repo);
// });

function isIRepo(obj: any): obj is IRepository {
    return obj && obj.name;
}

// Add or update information about a repository.
// TODO: Fix the gaping security bug in this code: If a user knows the
// name of a repository they don't have access to, they can make
// a PUT request to /git/db with that repository's name in it and they will
// be added to the list of user's who can access it. You should probably
// separate repository creation from repository updating to fix this
// properly.
router.put('/db', async (req, res, next) => {
    let irepo: IRepository;
    if (isIRepo(req.body)) {
        irepo = req.body;
    }
    else {
        console.error('Got an invalid IRepository object:');
        console.error(irepo);
        res.sendStatus(400);
    }

    // Add the requesting user to the list of allowed users.
    // This was a huge mistake because: YOU DIDN'T CHECK IF THIS REQUEST IS AUTHORIZED.
    if (!irepo.userIds) {
        irepo.userIds = [req.banxContext.remoteUser.glid];
    }
    else if (irepo.userIds.indexOf(req.banxContext.remoteUser.glid) < 0) {
        irepo.userIds.push(req.banxContext.remoteUser.glid);
    }

    let repo: Repository;
    try {
        repo = await req.banxContext.repoRepo.upsert(new Repository(irepo));
    }
    catch (err) {
        console.error('Failed to upsert a repository.');
        console.error(err);
        next(err);
        return;
    }
    res.send(repo);
});

// Delete a repository from the database and the filesystem.
router.delete('/db/:name', async (req, res, next) => {
    const name: string = req.params['name'];
    let success: boolean;
    try {
        success = await req.banxContext.repoRepo.del(name);
    }
    catch (err) {
        console.error(`An error occured while deleting '${name}'.`);
        console.error(err);
        next(err);
        return;
    }
    res.send(success);
});

// Anything under /repos will be passed off to git-http-backend.
router.use('/repos', onlyAllowRepoContributors);
router.use('/repos', gitHttpBackend);

export default router;