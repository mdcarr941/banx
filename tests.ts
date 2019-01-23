#!/usr/bin/node

import client from './dbClient';
import * as assert from 'assert';
import { Collection, DeleteWriteOpResultObject } from 'mongodb';

const collectionName = 'testing';

const insertDocuments = function(collection: Collection, callback: any) {
    collection.insertMany([
        {a:1}, {a:2}, {a:3}
    ], function(err, result) {
        assert.equal(null, err);
        assert.equal(3, result.result.n);
        assert.equal(3, result.ops.length);
        callback(result);
    });
}

const findDocuments = function(collection: Collection, callback: any) {
    collection.find({}).toArray(function(err: any, docs: any) {
        assert.equal(err, null);
        callback(docs);
    });
}

const deleteAllDocuments = function(collection: Collection, callback: Function) {
    collection.deleteMany({}).then(result => {
        callback(result);
    });
}

async function main(command: string): Promise<void> {
    const collection = await client.collection(collectionName);
    if ('insert' == command) {
        insertDocuments(collection, () =>
            console.log('Inserted 3 documents into the documents collection.')
        );
    } else if ('find' == command) {
        findDocuments(collection, (docs: any) => {
            console.log('Found the following documents:');
            console.log(docs);
        });
    } else if ('deleteAll' == command) {
        deleteAllDocuments(collection, (result: DeleteWriteOpResultObject) => {
            console.log(result);
            console.log('Delete finished.');
        })
    } else {
        throw 'Unrecognized argument: ' + command;
    }
    client.disconnect();
}

main(process.argv[2]);
