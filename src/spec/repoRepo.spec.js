describe('RepoRepo', function() {
    const repoRepo = require('../bin/repoRepo.js');
    const Repository = repoRepo.Repository;
    let globalRepoRepo;

    beforeEach(async function() {
        globalRepoRepo = await repoRepo.getGlobalRepoRepo();
    });
    
    it('should be created', function() {
        expect(globalRepoRepo).toBeTruthy();
    });

    it('can create and delete repos', async function() {
        const repoName = 'TestRepository289089';
        try {
            const repo = await globalRepoRepo.upsert(new Repository({name: repoName}));
            expect(repo._id).toBeTruthy();
        }
        finally {
            const success = await globalRepoRepo.del(repoName);
            expect(success).toBe(true);
        }
    });

    it('has unique names', async function() {
        const repoName = 'TestRepository';
        try {
            let repo = await globalRepoRepo.upsert(new Repository({name: repoName}));
            expect(repo._id).toBeTruthy();
            let caught = false;
            try {
                await globalRepoRepo.upsert(new Repository({name: repoName}));
            }
            catch {
                caught = true;
            }
            expect(caught).toBe(true);
        }
        finally {
            const success = await globalRepoRepo.del(repoName);
            expect(success).toBe(true);
        }
    });

    it('can list all repos', async function() {
        const name1 = 'TestRepo1';
        const repo1 = await globalRepoRepo.upsert(new Repository({name: name1}));

        try {
            expect(repo1._id).toBeTruthy();

            const name2 = 'TestRepo2';
            const repo2 = await globalRepoRepo.upsert(new Repository({name: name2}));
            expect(repo2._id).toBeTruthy();
    
            try {
                const names = await globalRepoRepo.list().toArray();
                expect(names.length).toBe(2);
                names.sort();
                expect(names[0]).toBe(name1);
                expect(names[1]).toBe(name2);
            }
            finally {
                const success2 = await globalRepoRepo.del(name2);
                expect(success2).toBe(true);
            }
        }
        finally {
            const success1 = await globalRepoRepo.del(name1);
            expect(success1).toBe(true);
        }
    });

    it('can filter names by prefix', async function() {
        const name1 = '1TestRepo';
        const repo1 = await globalRepoRepo.upsert(new Repository({name: name1}));

        try {
            expect(repo1._id).toBeTruthy();
            const name2 = '2TestRepo';
            const repo2 = await globalRepoRepo.upsert(new Repository({name: name2}));
            expect(repo2._id).toBeTruthy();
            
            try {
                const names = await globalRepoRepo.list('1').toArray();
                expect(names.length).toBe(1);
                expect(names[0]).toBe(name1);
            }
            finally {
                const success2 = await globalRepoRepo.del(name2);
                expect(success2).toBe(true);
            }
        }
        finally {
            const success1 = await globalRepoRepo.del(name1);
            expect(success1).toBe(true);
        }
    });

    it('can match prefixes in a case insensitive manner', async function() {
        const name1 = 'aTestRepo';
        const repo1 = await globalRepoRepo.upsert(new Repository({name: name1}));

        try {
            expect(repo1._id).toBeTruthy();
            const name2 = 'ATestRepo';
            const repo2 = await globalRepoRepo.upsert(new Repository({name: name2}));
            expect(repo2._id).toBeTruthy();
    
            try {
                const names = await globalRepoRepo.list('a', true).toArray();
                expect(names.length).toBe(2);
                names.sort();
                expect(names[0]).toBe(name2);
                expect(names[1]).toBe(name1);
            }
            finally {
                const success2 = await globalRepoRepo.del(name2);
                expect(success2).toBe(true);
            }
        }
        finally {
            const success1 = await globalRepoRepo.del(name1);
            expect(success1).toBe(true);
        }
    });

    it('should be able to persist users', async function() {
        const name = 'PersistUsersRepo';
        const userIds = ['mdcarr'];
        const repo = await globalRepoRepo.upsert(new Repository({name: name, userIds: userIds}));

        try {
            expect(repo._id).toBeTruthy();
            const loaded = await globalRepoRepo.get(name);
            expect(loaded.name).toBe(name);
            expect(loaded.userIds.length).toBe(1);
            expect(loaded.userIds[0]).toBe(userIds[0]);
        }
        finally {
            const success = await globalRepoRepo.del(name);
            expect(success).toBe(true);
        }
    });

    it ('should be able to update names', async function() {
        let repo = await globalRepoRepo.upsert(new Repository({name: 'RepoName1', userIds: []}));
        
        try {
            const newName = 'RepoName2';
            repo.name = newName;
            repo = await globalRepoRepo.upsert(repo)
            expect(repo.name).toBe(newName);

            const loaded = await globalRepoRepo.get(newName);
            expect(loaded.name).toBe(newName);
        }
        finally {
            expect(await globalRepoRepo.del(repo.name)).toBe(true);
        }
    });
});
