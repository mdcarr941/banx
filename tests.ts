#!/usr/bin/node

import * as assert from 'assert';
import { Collection, DeleteWriteOpResultObject, InsertWriteOpResult } from 'mongodb';

import client from './dbClient';
import { ProblemRepo } from './problemRepo';
import { Problem } from './schema';

const insertDocuments = function(repo: ProblemRepo, callback: any) {
    const prob1 = new Problem([
        { key: 'Ans', value: 'ShortAns' },
        { key: 'Type', value: 'Compute' },
        { key: 'Topic', value: 'Volume'},
        { key: 'Sub', value: 'Solid' },
        { key: 'File', value: '0001'}
    ], 'Test problem 1.');
    const prob2 = new Problem([
        { key: 'Ans', value: 'ShortAns' },
        { key: 'Type', value: 'Concept' },
        { key: 'Topic', value: 'Volume'},
        { key: 'Sub', value: 'Solid' },
        { key: 'File', value: '0002'}
    ], 'Test problem 2.');
    const prob3 = new Problem([
        { key: 'Ans', value: 'MultipleChoice' },
        { key: 'Type', value: 'Compute' },
        { key: 'Topic', value: 'Volume'},
        { key: 'Sub', value: 'Disc' },
        { key: 'File', value: '0001'}
    ], 'Test problem 3.');
    repo.insertMany([prob1, prob2, prob3]).then(result => {
        assert.equal(3, result.result.n);
        assert.equal(3, result.ops.length);
        callback(result);
    })
}

const findDocuments = function(repo: ProblemRepo, tokens: string[], callback: any) {
    const query = !tokens ? [] : tokens.map(s => s.split('@')).map(p => {
        return { key: p[0], value: p[1]}
    });
    repo.find(query).toArray(function(err: any, docs: any) {
        assert.equal(err, null);
        callback(docs);
    });
}

const deleteAllDocuments = function(repo: ProblemRepo, callback: Function) {
    repo.deleteMany([]).then(result => {
        callback(result);
    });
}

async function main(command: string, tokens: string[]): Promise<void> {
    const collection = await client.collection();
    const repo = new ProblemRepo(collection);
    if ('insert' == command) {
        insertDocuments(repo, (result: InsertWriteOpResult) =>
            console.log(`Inserted ${result.result.n} document into the documents collection.`)
        );
    } else if ('find' == command) {
        findDocuments(repo, tokens, (docs: any) => {
            console.log('Found the following documents:');
            console.log(docs);
        });
    } else if ('deleteAll' == command) {
        deleteAllDocuments(repo, (result: DeleteWriteOpResultObject) => {
            console.log(result);
            console.log('Delete finished.');
        })
    } else {
        throw 'Unrecognized argument: ' + command;
    }
    client.disconnect();
}

main(process.argv[2], process.argv.slice(3));
