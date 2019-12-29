describe('gitHttpBackend', function() {
    const gitHttpBackend = require('../bin/gitHttpBackend').gitHttpBackend;
    const repoRepo = require('../bin/repoRepo');
    const Repository = repoRepo.Repository;
    const testHelpers = require('./testHelpers');
    const git = require('isomorphic-git');
    const fs = require('fs');

    let globalRepoRepo;

    beforeAll(async function() {
        globalRepoRepo = await repoRepo.getGlobalRepoRepo();
        git.plugins.set('fs', fs);
    });

    it('should allow repositories to be cloned', async function() {
        const repoName = 'gitHttpBackendTestCloning';
        const repo = await globalRepoRepo.upsert(new Repository({name: repoName}));

        try {
        }
        finally {
            await globalRepoRepo.del(repoName);
        }
        expect(await testHelpers.pathExists(repo.path)).toBe(false);
    });
});