describe('Repository', function() {
    const Repository = require('../bin/repoRepo').Repository;
    const fs = require('fs');
    const path = require('path');
    const repo = new Repository({name: 'RepositoryTests'});

    async function exists(filePath) {
        try {
            await fs.promises.access(filePath, fs.constants.F_OK);
            return true;
        }
        catch {
            return false;
        }
    }

    beforeAll(async function() {
        if (await exists(repo.path)) {
            await repo.rm('.');
        }
    });

    it('should be instantiated', function() {
        expect(repo).toBeTruthy();
    });

    it('should be able to create directories', async function() {
        const sub = 'mkdirTest';
        await repo.mkdir(sub);
        expect(await exists(repo.fullPath(sub))).toBe(true);
    });
});