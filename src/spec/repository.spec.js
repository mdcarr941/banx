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

    it('should be instantiated', function() {
        expect(repo).toBeTruthy();
    });

    it('should be an error to access the path of a repo which is not in the DB', async function() {
        const sub = 'mkdirTest';
        let caught = false;
        try {
            await repo.path;
        }
        catch (Error) {
            caught = true;
        }
        expect(caught).toBe(true);
    });
});