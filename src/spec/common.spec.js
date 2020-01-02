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

        expect(common.urlJoin('a', null, 'b'))
            .toBe('a/b');

        expect(common.urlJoin('a', '/', 'b'))
            .toBe('a/b');

        expect(common.urlJoin('a', '', 'b'))
            .toBe('a/b');
    });

    it('should have a working basename function', function() {
        expect(common.basename('/orange')).toBe('orange');

        expect(common.basename('red/green/blue')).toBe('blue');

        expect(common.basename('')).toBe('');

        expect(common.basename(null)).toBe(null);

        expect(common.basename(undefined)).toBe(null);

        expect(common.basename(37)).toBe(null);

        expect(common.basename('/')).toBe('/');

        expect(common.basename('green/')).toBe('green');

        expect(common.basename('red/green/')).toBe('green');

        expect(common.basename('/a///')).toBe('a');

        expect(common.basename('////')).toBe('/');

        expect(common.basename('./')).toBe('.');

        expect(common.basename('../')).toBe('..');
    });

    it('should have a working dirname function', function() {
        expect(common.dirname('/a/b/d/l')).toBe('/a/b/d');
        
        expect(common.dirname('/a/')).toBe('/');

        expect(common.dirname('/a/b/')).toBe('/a');

        expect(common.dirname('/a/b//')).toBe('/a');

        expect(common.dirname('blue')).toBe('.');

        expect(common.dirname('blue/red')).toBe('blue');

        expect(common.dirname('..')).toBe('.');

        expect(common.dirname('../red')).toBe('..');

        expect(common.dirname('///a///b//')).toBe('///a');
    });
});