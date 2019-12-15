describe('RepoRepo', function() {
    const testHelpers = require('./testHelpers');

    const repoRepoModule = require('../bin/repoRepo.js');
    const Repository = repoRepoModule.Repository;
    const getGlobalRepoRepo = repoRepoModule.getGlobalRepoRepo;

    let repoRepo;

    beforeAll(async function() {
        repoRepo = await getGlobalRepoRepo();
    });
    
    it('should be created', function() {
        expect(repoRepo).toBeTruthy();
    });

    it('can create and delete repos', async function() {
        const repoName = 'TestRepository289089';
        const repo = await repoRepo.upsert(new Repository({name: repoName}));
        try {
            expect(repo._id).toBeTruthy();
            expect(await testHelpers.pathExists(repo.path)).toBe(true);
        }
        finally {
            expect(await repoRepo.del(repoName)).toBe(true);
        }
        expect(await testHelpers.pathExists(repo.path)).toBe(false);
    });

    it('has unique names', async function() {
        const repoName = 'TestRepository';
        let repo = await repoRepo.upsert(new Repository({name: repoName}));
        try {
            expect(repo._id).toBeTruthy();
            expect(await testHelpers.pathExists(repo.path)).toBe(true);
            let caught = false;
            try {
                await repoRepo.upsert(new Repository({name: repoName}));
            }
            catch {
                caught = true;
            }
            expect(caught).toBe(true);
        }
        finally {
            expect(await repoRepo.del(repoName)).toBe(true);
        }
        expect(await testHelpers.pathExists(repo.path)).toBe(false);
    });

    it('can list all repos', async function() {
        const name1 = 'TestRepo1';
        const repo1 = await repoRepo.upsert(new Repository({name: name1}));

        try {
            expect(repo1._id).toBeTruthy();
            expect(await testHelpers.pathExists(repo1.path)).toBe(true);

            const name2 = 'TestRepo2';
            const repo2 = await repoRepo.upsert(new Repository({name: name2}));
    
            try {
                expect(repo2._id).toBeTruthy();
                expect(await testHelpers.pathExists(repo2.path)).toBe(true);

                const names = await repoRepo.list().toArray();
                expect(names.length).toBe(2);
                names.sort();
                expect(names[0]).toBe(name1);
                expect(names[1]).toBe(name2);
            }
            finally {
                expect(await repoRepo.del(name2)).toBe(true);
            }
            expect(await testHelpers.pathExists(repo2.path)).toBe(false);
        }
        finally {
            expect(await repoRepo.del(name1)).toBe(true);
        }
        expect(await testHelpers.pathExists(repo1.path)).toBe(false);
    });

    it('can filter names by prefix', async function() {
        const name1 = '1TestRepo';
        const repo1 = await repoRepo.upsert(new Repository({name: name1}));

        try {
            expect(repo1._id).toBeTruthy();
            expect(await testHelpers.pathExists(repo1.path)).toBe(true);

            const name2 = '2TestRepo';
            const repo2 = await repoRepo.upsert(new Repository({name: name2}));
            
            try {
                expect(repo2._id).toBeTruthy();
                expect(await testHelpers.pathExists(repo2.path)).toBe(true);

                const names = await repoRepo.list('1').toArray();
                expect(names.length).toBe(1);
                expect(names[0]).toBe(name1);
            }
            finally {
                expect(await repoRepo.del(name2)).toBe(true);
            }
            expect(await testHelpers.pathExists(repo2.path)).toBe(false);
        }
        finally {
            expect(await repoRepo.del(name1)).toBe(true);
        }
        expect(await testHelpers.pathExists(repo1.path)).toBe(false);
    });

    it('can match prefixes in a case insensitive manner', async function() {
        const name1 = 'aTestRepo';
        const repo1 = await repoRepo.upsert(new Repository({name: name1}));

        try {
            expect(repo1._id).toBeTruthy();
            expect(await testHelpers.pathExists(repo1.path)).toBe(true);

            const name2 = 'ATestRepo';
            const repo2 = await repoRepo.upsert(new Repository({name: name2}));
    
            try {
                expect(repo2._id).toBeTruthy();
                expect(await testHelpers.pathExists(repo2.path)).toBe(true);

                const names = await repoRepo.list('a', true).toArray();
                expect(names.length).toBe(2);
                names.sort();
                expect(names[0]).toBe(name2);
                expect(names[1]).toBe(name1);
            }
            finally {
                expect(await repoRepo.del(name2)).toBe(true);
            }
            expect(await testHelpers.pathExists(repo2.path)).toBe(false);
        }
        finally {
            expect(await repoRepo.del(name1)).toBe(true);
        }
        expect(await testHelpers.pathExists(repo1.path)).toBe(false);
    });

    it('should be able to persist users', async function() {
        const name = 'PersistUsersRepo';
        const userIds = ['mdcarr'];
        const repo = await repoRepo.upsert(new Repository({name: name, userIds: userIds}));

        try {
            expect(repo._id).toBeTruthy();
            expect(await testHelpers.pathExists(repo.path)).toBe(true);

            const loaded = await repoRepo.get(name);
            expect(loaded.name).toBe(name);
            expect(loaded.userIds.length).toBe(1);
            expect(loaded.userIds[0]).toBe(userIds[0]);
        }
        finally {
            expect(await repoRepo.del(name)).toBe(true);
        }
        expect(await testHelpers.pathExists(repo.path)).toBe(false);
    });

    it('should be able to update names', async function() {
        let repo = await repoRepo.upsert(new Repository({name: 'RepoName1', userIds: []}));
        const originalPath = repo.path;
        
        try {
            expect(await testHelpers.pathExists(repo.path)).toBe(true);

            const newName = 'RepoName2';
            repo.name = newName;
            repo = await repoRepo.upsert(repo)
            expect(repo.name).toBe(newName);
            expect(repo.path).toBe(originalPath);

            const loaded = await repoRepo.get(newName);
            expect(loaded.name).toBe(newName);
        }
        finally {
            expect(await repoRepo.del(repo.name)).toBe(true);
        }
        expect(await testHelpers.pathExists(repo.path)).toBe(false);
    });

    it('should be able to find an editor\'s repositories', async function() {
        const userId = 'someguy';
        const [repo0, repo1] = await Promise.all([
            repoRepo.upsert(new Repository({name: 'repo0', userIds: [userId]})),
            repoRepo.upsert(new Repository({name: 'repo1', userIds: [userId]}))       
        ]);
        
        try {
            const repos = await repoRepo.getEditorsRepos(userId).toArray();
            const repoNames = repos.map(repo => repo.name).sort();
            expect(repoNames.length).toBe(2);
            expect(repoNames[0]).toBe(repo0.name);
            expect(repoNames[1]).toBe(repo1.name);
        }
        finally {
            await Promise.all([
                repoRepo.del(repo0.name),
                repoRepo.del(repo1.name)
            ]);
        }
        
        expect(
            await Promise.all([
                testHelpers.pathExists(repo0.path), testHelpers.pathExists(repo1.path)
            ])
            .then(([v0, v1]) => v0 || v1)
        ).toBe(false);
    });
});
