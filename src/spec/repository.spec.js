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

    it('should have a null path if it isn\'t in the DB', function() {
        const testRepo = new Repository({name: 'TestRepo5452'});
        expect(testRepo.path).toBe(null);
    });
});