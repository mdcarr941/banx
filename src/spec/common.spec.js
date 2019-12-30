const common = require('../bin/common');

fdescribe('common module', function() {
    it('should be able to join url segments', function() {
        expect(common.urlJoin('/', '/banx/', 'app', 'courses/'))
            .toBe('/banx/app/courses/');

        expect(common.urlJoin('/banx', 'git/db'))
            .toBe('/banx/git/db');

        expect(common.urlJoin('', 'banx', 'some', 'subpath/'))
            .toBe('/banx/some/subpath/');

        expect(common.urlJoin('top', '/', '', 'middle/', '/bottom'))
            .toBe('top/middle/bottom');
    });
});