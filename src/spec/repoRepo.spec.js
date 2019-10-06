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
    });

    it('can list all repos', async function() {
        const name1 = 'TestRepo1';
        const repo1 = new Repository({name: name1});

        const insert1 = await globalRepoRepo.insert(repo1);
        expect(insert1.result.ok).toBe(1);

        const name2 = 'TestRepo2';
        const repo2 = new Repository({name: name2});

        const insert2 = await globalRepoRepo.insert(repo2);
        expect(insert2.result.ok).toBe(1);

        const names = await globalRepoRepo.list().toArray();
        expect(names.length).toBe(2);
        names.sort();
        expect(names[0]).toBe(name1);
        expect(names[1]).toBe(name2);

        const success1 = await globalRepoRepo.del(name1);
        expect(success1).toBe(true);

        const success2 = await globalRepoRepo.del(name2);
        expect(success2).toBe(true);
    });

    it('can filter names by prefix', async function() {
        const name1 = '1TestRepo';
        const repo1 = new Repository({name: name1});
        const insert1 = await globalRepoRepo.insert(repo1);
        expect(insert1.result.ok).toBe(1);

        const name2 = '2TestRepo';
        const repo2 = new Repository({name: name2});
        const insert2 = await globalRepoRepo.insert(repo2);
        expect(insert2.result.ok).toBe(1);
        
        const names = await globalRepoRepo.list('1').toArray();
        expect(names.length).toBe(1);
        expect(names[0]).toBe(name1);

        const success1 = await globalRepoRepo.del(name1);
        expect(success1).toBe(true);

        const success2 = await globalRepoRepo.del(name2);
        expect(success2).toBe(true);
    });

    it('can match prefixes in a case insensitive manner', async function() {
        const name1 = 'aTestRepo';
        const repo1 = new Repository({name: name1});
        const insert1 = await globalRepoRepo.insert(repo1);
        expect(insert1.result.ok).toBe(1);

        const name2 = 'ATestRepo';
        const repo2 = new Repository({name: name2});
        const insert2 = await globalRepoRepo.insert(repo2);
        expect(insert2.result.ok).toBe(1);

        const names = await globalRepoRepo.list('a', true).toArray();
        expect(names.length).toBe(2);
        names.sort();
        expect(names[0]).toBe(name2);
        expect(names[1]).toBe(name1);

        const success1 = await globalRepoRepo.del(name1);
        expect(success1).toBe(true);

        const success2 = await globalRepoRepo.del(name2);
        expect(success2).toBe(true);
    });
});
