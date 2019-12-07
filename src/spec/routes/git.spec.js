describe('git router', function() {
    const app = require('../../bin/app.js').app;
    const request = require('supertest');


    it('should list a user\'s courses', function(done) {
        request(app)
            .get('/git')
            .set('ufshib_eppn', 'mdcarr')
            .expect('Content-Type', /^application\/json/)
            .expect(200, (err, res) => {
                if (err) done(err);
                else {
                    expect(res.body.length).toBe(1);
                    done();
                }
            });
    });
});