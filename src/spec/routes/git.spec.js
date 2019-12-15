describe('git router', function() {
    const request = require('supertest');
    const mongodb = require('mongodb');

    const testHelpers = require('../testHelpers');
    const repoRepoModule = require('../../bin/repoRepo');
    const Repository = repoRepoModule.Repository;
    const getGlobalRepoRepo = repoRepoModule.getGlobalRepoRepo;
    const app = require('../../bin/app.js').app;
    const getGlobalUserRepo = require('../../bin/userRepo').getGlobalUserRepo;
    const BanxUser = require('../../bin/schema').BanxUser;
    const testUserId = 'testuser';

    beforeAll(async function() {
        const userRepo = await getGlobalUserRepo();
        await userRepo.insert(new BanxUser({ glid: testUserId }));
    });

    afterAll(async function() {
        const userRepo = await getGlobalUserRepo();
        await userRepo.del(testUserId);
    });

    it('should list a user\'s courses', async function() {
        const repoRepo = await getGlobalRepoRepo();
        const repoName = 'Test Repository 1';
        const repo = await repoRepo.upsert(new Repository(
            {name: repoName, userIds: [ testUserId ]}
        ));

        try {
            const res = await request(app)
                .get('/git/db')
                .set('ufshib_eppn', testUserId)
                .expect('Content-Type', /^application\/json/)
                .expect(200)
            expect(res.body.length).toBe(1);

            const resRepo = res.body[0];
            expect(resRepo.name).toBe(repo.name);
            expect(resRepo.userIds.length).toBe(1);
            expect(resRepo.userIds[0]).toBe(repo.userIds[0]);
        }
        finally {
            await repoRepo.del(repoName);
        }
    });

    it('should get the empty list for a user with no courses', async function() {
        const res = await request(app)
            .get('/git/db')
            .set('ufshib_eppn', testUserId)
            .expect('Content-Type', /^application\/json/)
            .expect(200);
        expect(res.body.length).toBe(0);
    });

    it('should create new repositories', async function() {
        const repoName = 'testrepo233';
        const res = await request(app)
            .put('/git/db')
            .set('ufshib_eppn', testUserId)
            .send({name: repoName})
            .expect('Content-Type', /^application\/json/)
            .expect(200);
        const repo = new Repository({
            _id: res.body._id,
            name: res.body.name,
            userIds: res.body.userIds
        });
        
        try {
            expect(repo.name).toBe(repoName);
            expect(repo.userIds.length).toBe(1);
            expect(repo.userIds[0]).toBe(testUserId);
            expect(await testHelpers.pathExists(repo.path)).toBe(true);
        }
        finally {
            const repoRepo = await getGlobalRepoRepo();
            await repoRepo.del(repoName);
        }
        expect(await testHelpers.pathExists(repo.path)).toBe(false);
    });

    it('should be able to update repositories', async function() {
        let repoName = 'testrepo29890';
        const res = await request(app)
            .put('/git/db')
            .set('ufshib_eppn', testUserId)
            .send({name: repoName})
            .expect('Content-Type', /^application\/json/)
            .expect(200);
        const repo = new Repository({
            _id: res.body._id,
            name: res.body.name,
            userIds: res.body.userIds
        });

        try {
            expect(repo.name).toBe(repoName);

            const newName = 'newtestreponame2980';
            repo.name = newName;
            const res2 = await request(app)
                .put('/git/db')
                .set('ufshib_eppn', testUserId)
                .send(repo)
                .expect('Content-Type', /^application\/json/)
                .expect(200);
            repoName = repo.name;

            const repo2 = new Repository({
                _id: res2.body._id,
                name: res2.body.name,
                userIds: res2.body.userIds
            });
            expect(repo2.name).toBe(newName);
        }
        finally {
            const repoRepo = await getGlobalRepoRepo();
            await repoRepo.del(repoName);
        }
        expect(await testHelpers.pathExists(repo.path)).toBe(false);
    });
});