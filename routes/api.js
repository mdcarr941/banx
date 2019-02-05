const express = require('express');
const router = express.Router();

const client = require('../bin/dbClient').default;
const ProblemRepo = require('../bin/problemRepo').ProblemRepo;
const makePairs = require('../bin/common').makePairs;

let repo;
async function init() {
    const collection = await client.collection();
    repo = new ProblemRepo(collection);
}

router.get('/problems', (req, res) => {
    let tags = req.query.tags;
    if (!(req.query.tags instanceof Array)) tags = [tags];
    query = makePairs(tags);
    repo.find(query).toArray((err, problems) => {
        if (err) throw err;
        else res.send(problems);
    });
});

init().catch(err => {
    console.error('Failed to initialize the API.');
    throw err;
});

module.exports = router
    