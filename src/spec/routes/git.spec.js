describe('git router', function() {
    const request = require('supertest');
    const mongodb = require('mongodb');
    const child_process = require('child_process');
    const os = require('os');
    const fsOld = require('fs');
    const fs = fsOld.promises;
    const http = require('http');
    const git = require('isomorphic-git');
    const path = require('path');

    const config = require('../../bin/config').default;
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
        git.plugins.set('fs', fsOld);
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
        let res = await request(app)
            .put('/git/db')
            .set('ufshib_eppn', testUserId)
            .send({name: repoName})
            .expect('Content-Type', /^application\/json/)
            .expect(200);
        let repo = new Repository(res.body);

        try {
            expect(repo.name).toBe(repoName);
            expect(repo.userIds.length).toBe(1);
            expect(repo.userIds[0]).toBe(testUserId);

            const newName = 'newtestreponame2980';
            const newUser = 'newuser';
            repo.name = newName;
            repo.userIds.push(newUser);
            res = await request(app)
                .put('/git/db')
                .set('ufshib_eppn', testUserId)
                .send(repo)
                .expect('Content-Type', /^application\/json/)
                .expect(200);
            repoName = repo.name;
            repo = new Repository(res.body);

            expect(repo.name).toBe(newName);
            expect(repo.userIds.length).toBe(2);
            expect(repo.userIds.indexOf(testUserId) >= 0).toBe(true);
            expect(repo.userIds.indexOf(newUser) >= 0).toBe(true);
        }
        finally {
            const repoRepo = await getGlobalRepoRepo();
            await repoRepo.del(repoName);
        }
        expect(await testHelpers.pathExists(repo.path)).toBe(false);
    });

    it('should only allow contributors to access a repo', async function() {
        const repoName = 'accesstest';
        const repoRepo = await getGlobalRepoRepo();
        const repo = await repoRepo.upsert(new Repository({
            name: repoName,
            userIds: [ testUserId ]
        }));
        const url = `/git/repos/${repo.dir()}/info/refs?service=git-upload-pack`;

        try {
            await request(app)
                .get(url)
                .set('ufshib_eppn', testUserId)
                .expect(200);

            await request(app)
                .get(url)
                .set('ufshib_eppn', testUserId + '0')
                .expect(403);
        }
        finally {
            await repoRepo.del(repoName);
        }
    });

    it('should allow repositories to be cloned', async function() {
        const repoName = 'clonetest2980';
        let repo = new Repository({name: repoName});
        let res = await request(app)
            .put('/git/db')
            .set('ufshib_eppn', testUserId)
            .send(repo)
            .expect('Content-Type', /^application\/json/)
            .expect(200);
        repo = new Repository(res.body);
        
        try {
            expect(await testHelpers.pathExists(repo.path)).toBe(true);

            const server = http.createServer(app);
            server.listen(config.port);
            await new Promise(resolve => {
                server.on('listening', () => resolve());
            });

            const tempDir = await testHelpers.getTempDir();

            try {
                const repoUrl = `http://localhost:${config.port}/git/repos/${repo.dir()}`;
                expect(await testHelpers.gitClone(repoUrl, tempDir, testUserId)).toBe(0);

                const testFile = 'testFile.txt';
                const fileContents = 'A string of text.';
                await fs.appendFile(path.join(tempDir, testFile), fileContents);

                expect(await testHelpers.gitAdd(tempDir, testFile, testUserId)).toBe(0);
                expect(await testHelpers.gitCommit(tempDir, 'Initial commit', testUserId)).toBe(0);
                expect(await testHelpers.gitPush(tempDir, testUserId)).toBe(0);

                const tempDir2 = await testHelpers.getTempDir();
                try {
                    expect(await testHelpers.gitClone(repoUrl, tempDir2, testUserId)).toBe(0);
                    expect(await fs.readFile(path.join(tempDir2, testFile), 'utf8')).toBe(fileContents);
                }
                finally {
                    await repoRepoModule.rm(tempDir2);
                }
                expect(await testHelpers.pathExists(tempDir2)).toBe(false);
            }
            finally {
                await repoRepoModule.rm(tempDir);
                await new Promise((resolve, reject) => server.close(err => {
                    if (err) reject(err);
                    else resolve();
                }));
            }
            expect(await testHelpers.pathExists(tempDir)).toBe(false);
        }
        finally {
            const repoRepo = await getGlobalRepoRepo();
            await repoRepo.del(repoName);
        }
        expect(await testHelpers.pathExists(repo.path)).toBe(false);
    });

    it('should allow repositories to be cloned with isomorphic git', async function() {
        const repoName = 'gitRouterCloneWithIsoGit';
        const repoRepo = await getGlobalRepoRepo();

        const repo = await repoRepo.upsert(new Repository({name: repoName, userIds: [testUserId]}));
        try {
            const dir = await testHelpers.getTempDir();
            try {
                const server = await testHelpers.startServer(app);
                try {
                    const headers = { 'ufshib_eppn': testUserId };
                    const url = testHelpers.repoUrl(repo);
                    await git.clone({
                        dir,
                        url,
                        ref: 'master',
                        singleBranch: true,
                        depth: 1,
                        headers
                    });

                    const testFile = 'testFile.txt';
                    const fileContents = 'This is an English sentence.';
                    await fs.appendFile(
                        path.join(dir, testFile),
                        fileContents
                    );

                    await git.add({
                        dir,
                        filepath: testFile 
                    });

                    await git.commit({
                        dir,
                        message: 'Initial commit',
                        author: {
                            name: testUserId,
                            email: testUserId + '@ufl.edu'
                        }
                    });

                    await git.push({
                        dir,
                        headers
                    });

                    const dir2 = await testHelpers.getTempDir();
                    try {
                        await git.clone({
                            dir: dir2,
                            url,
                            ref: 'master',
                            singleBranch: true,
                            depth: 1,
                            headers
                        });
                    }
                    finally {
                        await repoRepoModule.rm(dir2);
                    }
                }
                finally {
                    await testHelpers.stopServer(server);
                }
            }
            finally {
              await repoRepoModule.rm(dir);
            }
            expect(await testHelpers.pathExists(dir)).toBe(false);
        }
        finally {
            await repoRepo.del(repoName);
        }
        expect(await testHelpers.pathExists(repo.path)).toBe(false);
    });

    it('should respond appropriately when a repository does not exist.', async function() {
        const repoId = await testHelpers.nonExistantRepoId();
        const repo = new Repository({_id: repoId});

        const url = `/git/repos/${repo.dir()}/info/refs?service=git-upload-pack`;
        await request(app)
            .get(url)
            .set('ufshib_eppn', testUserId)
            .send()
            .expect(404);
    });

    it('should be able to delete repositories.', async function() {
        const name = await testHelpers.nonExistantRepoName();
        const repoRepo = await getGlobalRepoRepo();

        await request(app)
            .put('/git/db')
            .set('ufshib_eppn', testUserId)
            .send(new Repository({name}))
            .expect(200);
        try {
            const repo = await repoRepo.get(name);
            expect(repo).toBeTruthy();
            expect(repo instanceof Repository).toBe(true);

            await request(app)
                .delete(`/git/db/${name}`)
                .set('ufshib_eppn', testUserId)
                .send()
                .expect(200);
            
            expect(await repoRepo.get(name)).toBe(null);
        }
        finally {
            await repoRepo.del(name);
        }
    })
});