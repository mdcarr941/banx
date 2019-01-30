#!/usr/bin/node

import * as assert from 'assert';
import { Collection, DeleteWriteOpResultObject, InsertWriteOpResult } from 'mongodb';

import client from './dbClient';
import { ProblemRepo } from './problemRepo';
import { Problem } from './schema';

async function insertDocuments(repo: ProblemRepo): Promise<InsertWriteOpResult> {
    const prob1 = new Problem({
        tags: [
            { key: 'Ans', value: 'ShortAns' },
            { key: 'Type', value: 'Compute' },
            { key: 'Topic', value: 'Volume'},
            { key: 'Sub', value: 'Solid' },
            { key: 'File', value: '0001'}
        ],
        content: 'Test problem 1.'
    });
    const prob2 = new Problem({
        tags: [
            { key: 'Ans', value: 'ShortAns' },
            { key: 'Type', value: 'Concept' },
            { key: 'Topic', value: 'Volume'},
            { key: 'Sub', value: 'Solid' },
            { key: 'File', value: '0002'}
        ],
        content: 'Test problem 2.'
    });
    const prob3 = new Problem({
        tags: [
            { key: 'Ans', value: 'MultipleChoice' },
            { key: 'Type', value: 'Compute' },
            { key: 'Topic', value: 'Volume'},
            { key: 'Sub', value: 'Disc' },
            { key: 'File', value: '0001'}
        ],
        content: 'Test problem 3.'
    });
    return repo.insertMany([prob1, prob2, prob3]).then(result => {
        assert.equal(3, result.result.n);
        assert.equal(3, result.ops.length);
        return result;
    })
}

async function findDocuments(repo: ProblemRepo, tokens: string[]): Promise<Problem[]> {
    const query = !tokens ? [] : tokens.map(s => s.split('@')).map(p => {
        return { key: p[0], value: p[1]}
    });
    const rval: Promise<Problem[]> = new Promise((resolve, reject) => {
        repo.find(query).toArray(function(err, probs: Problem[]) {
            if (err) reject(err);
            else resolve(probs);
        });
    });
    return rval;
}

async function deleteAllDocuments(repo: ProblemRepo) {
    return repo.deleteMany([]);
}

async function main(command: string, tokens: string[]): Promise<void> {
    const collection = await client.collection();
    const repo = new ProblemRepo(collection);
    if ('insert' == command) {
        await insertDocuments(repo).then(result =>
            console.log(`Inserted ${result.result.n} document into the documents collection.`)
        );
    } else if ('find' == command) {
        await findDocuments(repo, tokens).then(docs => {
            console.log('Found the following documents:');
            docs.forEach(prob => console.log(prob));
        });
    } else if ('deleteAll' == command) {
        await deleteAllDocuments(repo).then((result: DeleteWriteOpResultObject) => {
            console.log(result);
            console.log('Delete finished.');
        });
    } else {
        throw 'Unrecognized argument: ' + command;
    }
    client.disconnect();
}

main(process.argv[2], process.argv.slice(3))
    .then(_ => process.exit(0))
    .catch(_ => process.exit(1));
