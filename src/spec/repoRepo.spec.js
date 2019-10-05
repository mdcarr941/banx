describe('RepoRepo', function() {
    const repoRepo = require('../bin/repoRepo.js');
    const Repository = require('../bin/schema.js').Repository;
    let globalRepoRepo;

    beforeEach(async function() {
        globalRepoRepo = await repoRepo.getGlobalRepoRepo();
    });
    
    it('should be created', function() {
        expect(globalRepoRepo).toBeTruthy();
    });

    it('can create and delete repos', async function() {
        const repoName = 'TestRepository';
        const repo = new Repository({name: repoName});
        const output = await globalRepoRepo.insert(repo);
        expect(output.result.ok).toBe(1);

        const success = await globalRepoRepo.del(repoName);
        expect(success).toBe(true);
    });

    it('has unique names', async function() {
        const repoName = 'TestRepository';
        const repo = new Repository({name: repoName});

        const output = await globalRepoRepo.insert(repo);
        expect(output.result.ok).toBe(1);

        const caught = await globalRepoRepo.insert(repo).catch(() => true);
        expect(caught).toBe(true);

        const success = await globalRepoRepo.del(repoName);
        expect(success).toBe(true);
    })
});
