import * as express from 'express';

import { onlyAllowRepoContributors } from '../middleware';
import { gitHttpBackend } from '../gitHttpBackend';
import { getGlobalRepoRepo, Repository } from '../repoRepo';
import { IRepository } from 'schema';

const router = express.Router();

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
    }
    res.send(repos);
});

// Return information about the repo with 'name'.
router.get('/db/:name', async (req, res, next) => {
    const name: string = req.params['name'];
    let repo: Repository;
    try {
        repo = await req.banxContext.repoRepo.get(name);
    }
    catch (err) {
        console.error(`Failed to get the repository with the name ${name}:`);
        console.error(err);
        next(err);
    }
    res.send(repo);
});

function isIRepo(obj: any): obj is IRepository {
    return obj && obj.name;
}

// Add or update information about a repository.
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
    }
    res.send(repo);
});

// Anything under /repos will be passed off to git-http-backend.
router.use('/repos', onlyAllowRepoContributors);
router.use('/repos', gitHttpBackend);

export default router;