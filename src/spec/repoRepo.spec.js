describe('RepoRepo', function() {
    const repoRepoModule = require('../bin/repoRepo.js');
    const Repository = repoRepoModule.Repository;
    const testHelpers = require('./testHelpers');

    let repoRepo;

    beforeAll(async function() {
        const RepoRepo = repoRepoModule.RepoRepo;
        const mongoUri = await testHelpers.makeMongoUri();
        const DbClient = require('../bin/dbClient').DbClient;
        repoRepo = await RepoRepo.create(new DbClient(mongoUri));
    });

    afterAll(async function() {
        await testHelpers.dropTestingDb();
    });
    
    it('should be created', function() {
        expect(repoRepo).toBeTruthy();
    });

    it('can create and delete repos', async function() {
        const repoName = 'TestRepository289089';
        try {
            const repo = await repoRepo.upsert(new Repository({name: repoName}));
            expect(repo._id).toBeTruthy();
        }
        finally {
            const success = await repoRepo.del(repoName);
            expect(success).toBe(true);
        }
    });

    it('has unique names', async function() {
        const repoName = 'TestRepository';
        try {
            let repo = await repoRepo.upsert(new Repository({name: repoName}));
            expect(repo._id).toBeTruthy();
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
            const success = await repoRepo.del(repoName);
            expect(success).toBe(true);
        }
    });

    it('can list all repos', async function() {
        const name1 = 'TestRepo1';
        const repo1 = await repoRepo.upsert(new Repository({name: name1}));

        try {
            expect(repo1._id).toBeTruthy();

            const name2 = 'TestRepo2';
            const repo2 = await repoRepo.upsert(new Repository({name: name2}));
            expect(repo2._id).toBeTruthy();
    
            try {
                const names = await repoRepo.list().toArray();
                expect(names.length).toBe(2);
                names.sort();
                expect(names[0]).toBe(name1);
                expect(names[1]).toBe(name2);
            }
            finally {
                const success2 = await repoRepo.del(name2);
                expect(success2).toBe(true);
            }
        }
        finally {
            const success1 = await repoRepo.del(name1);
            expect(success1).toBe(true);
        }
    });

    it('can filter names by prefix', async function() {
        const name1 = '1TestRepo';
        const repo1 = await repoRepo.upsert(new Repository({name: name1}));

        try {
            expect(repo1._id).toBeTruthy();
            const name2 = '2TestRepo';
            const repo2 = await repoRepo.upsert(new Repository({name: name2}));
            expect(repo2._id).toBeTruthy();
            
            try {
                const names = await repoRepo.list('1').toArray();
                expect(names.length).toBe(1);
                expect(names[0]).toBe(name1);
            }
            finally {
                const success2 = await repoRepo.del(name2);
                expect(success2).toBe(true);
            }
        }
        finally {
            const success1 = await repoRepo.del(name1);
            expect(success1).toBe(true);
        }
    });

    it('can match prefixes in a case insensitive manner', async function() {
        const name1 = 'aTestRepo';
        const repo1 = await repoRepo.upsert(new Repository({name: name1}));

        try {
            expect(repo1._id).toBeTruthy();
            const name2 = 'ATestRepo';
            const repo2 = await repoRepo.upsert(new Repository({name: name2}));
            expect(repo2._id).toBeTruthy();
    
            try {
                const names = await repoRepo.list('a', true).toArray();
                expect(names.length).toBe(2);
                names.sort();
                expect(names[0]).toBe(name2);
                expect(names[1]).toBe(name1);
            }
            finally {
                const success2 = await repoRepo.del(name2);
                expect(success2).toBe(true);
            }
        }
        finally {
            const success1 = await repoRepo.del(name1);
            expect(success1).toBe(true);
        }
    });

    it('should be able to persist users', async function() {
        const name = 'PersistUsersRepo';
        const userIds = ['mdcarr'];
        const repo = await repoRepo.upsert(new Repository({name: name, userIds: userIds}));

        try {
            expect(repo._id).toBeTruthy();
            const loaded = await repoRepo.get(name);
            expect(loaded.name).toBe(name);
            expect(loaded.userIds.length).toBe(1);
            expect(loaded.userIds[0]).toBe(userIds[0]);
        }
        finally {
            const success = await repoRepo.del(name);
            expect(success).toBe(true);
        }
    });

    it('should be able to update names', async function() {
        let repo = await repoRepo.upsert(new Repository({name: 'RepoName1', userIds: []}));
        
        try {
            const newName = 'RepoName2';
            repo.name = newName;
            repo = await repoRepo.upsert(repo)
            expect(repo.name).toBe(newName);

            const loaded = await repoRepo.get(newName);
            expect(loaded.name).toBe(newName);
        }
        finally {
            expect(await repoRepo.del(repo.name)).toBe(true);
        }
    });

    it('should be able to find an editors repositories', async function() {
        const userId = 'someguy';
        await Promise.all([
            repoRepo.upsert(new Repository({name: 'Repo1', userIds: [userId]})),
            repoRepo.upsert(new Repository({name: 'Repo2', userIds: [userId]}))       
        ]);
        
        try {
            const repos = await repoRepo.getEditorsRepos(userId).toArray();
            const repoNames = repos.map(repo => repo.name).sort();
            expect(repoNames.length).toBe(2);
            expect(repoNames[0]).toBe('Repo1');
            expect(repoNames[1]).toBe('Repo2');
        }
        finally {
            await Promise.all([
                repoRepo.del('Repo1'),
                repoRepo.del('Repo2')
            ]);
        }
    });
});
