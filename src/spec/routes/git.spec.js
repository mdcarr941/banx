describe('git router', function() {
    const request = require('supertest');
    const mongodb = require('mongodb');
    const child_process = require('child_process');
    const os = require('os');
    const fs = require('fs').promises;
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
        git.plugins.set('fs', fs);
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
                const subproc = child_process.spawn(
                    'git',
                    [
                        '-c', `http.extraHeader=ufshib_eppn: ${testUserId}`,
                        'clone', repoUrl
                    ],
                    {cwd: tempDir}
                );
                subproc.stdout.pipe(process.stdout);
                subproc.stderr.on('data', chunk => {
                    console.error(`git stderr: ${chunk}`);
                })
                process.stdin.pipe(subproc.stdin);
                const exit = new Promise((resolve, reject) => {
                    subproc.on('exit', (code, signal) => {
                        if (code || signal) {
                            console.error(`Git exited abnormally: code = ${code}, signal = ${signal}`);
                            reject(code);
                        }
                        else resolve(code);
                    });
                });
                const error = new Promise((resolve, reject) => {
                    subproc.on('error', (err) => {
                        console.error('The git subprocess threw an error:');
                        console.error(err);
                        reject(err);
                    });
                });

                const code = await Promise.race([exit, error]);
                expect(code).toBe(0);
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
        const repo = await repoRepo.upsert(new Repository({name: repoName}));

        try {
            const tempDir = await testHelpers.getTempDir();
            try {
                const server = http.createServer(app);
                server.listen(config.port);
                await new Promise(resolve => {
                    server.on('listening', () => resolve());
                });

                try {
                    await git.clone({
                        dir: '/tmp/tempDir',
                        url: `http://localhost:${config.port}/git/repos${repo.dir}`,
                        ref: 'master',
                        singleBranch: true,
                        depth: 1
                    });
                }
                finally {
                    await new Promise((resolve, reject) => server.close(err => {
                        if (err) reject(err);
                        else resolve();
                    }));
                }
            }
            finally {
              repoRepoModule.rm(tempDir);
            }
        }
        finally {
            await repoRepo.del(repoName);
        }
        expect(await testHelpers.pathExists(repo.path)).toBe(false);
    });
});