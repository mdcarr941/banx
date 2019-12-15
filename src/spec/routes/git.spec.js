describe('git router', function() {
    const request = require('supertest');
    const mongodb = require('mongodb');

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
                .get('/git')
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
            .get('/git')
            .set('ufshib_eppn', testUserId)
            .expect('Content-Type', /^application\/json/)
            .expect(200);
        expect(res.body.length).toBe(0);
    });
});