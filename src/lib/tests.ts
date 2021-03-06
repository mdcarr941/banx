#!/usr/bin/env node

import * as assert from 'assert';
import { DeleteWriteOpResultObject, InsertWriteOpResult } from 'mongodb';

import { ProblemRepo, getGlobalProblemRepo } from './problemRepo';
import { Problem } from './schema';
import { GlobalProblemGenerator } from './problemGenerator';

function insertDocuments(repo: ProblemRepo): Promise<InsertWriteOpResult> {
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

function findDocuments(repo: ProblemRepo, tokens: string[]): Promise<Problem[]> {
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

function getAllValues(repo: ProblemRepo, key: string): Promise<string[]> {
    return repo.getAllValues(key);
}

function deleteAllDocuments(repo: ProblemRepo): Promise<DeleteWriteOpResultObject> {
    return repo.deleteAll();
}

async function getInstance(id: string): Promise<void> {
    return GlobalProblemGenerator.getInstance(id)
        .then(problem => console.log(problem.toString()));
}

async function main(command: string, tokens: string[]): Promise<void> {
    const repo = await getGlobalProblemRepo();
    if ('insert' == command) {
        await insertDocuments(repo).then(result => {
            console.log(`Inserted ${result.result.n} document${result.result.n == 1 ? '' : 's'} into the collection.`)
        });
    } else if ('find' == command) {
        await findDocuments(repo, tokens).then(docs => {
            console.log('Found the following documents:');
            docs.forEach(prob => console.log(prob));
        });
    } else if ('getAllValues' == command) {
        await getAllValues(repo, tokens[0]).then((values: string[]) => {
            values.forEach(value => console.log(value));
            console.log(`Found ${values.length} value${values.length == 1 ? '' : 's'}`);
        });
    } else if ('deleteAll' == command) {
        await deleteAllDocuments(repo).then((result) => {
            console.log('Delete finished.');
        });
    } else if ('getInstance' == command) {
        await getInstance(tokens[0]).catch(err => {
            console.error('An error occured while running getInstance: ', err);
        });
    } else {
        throw 'Unrecognized argument: ' + command;
    }
}

main(process.argv[2], process.argv.slice(3))
    .then(() => process.exit(0))
    .catch(err => {
        console.log(err);
        process.exit(1)
    });
