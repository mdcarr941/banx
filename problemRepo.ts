import { Collection, Cursor, InsertOneWriteOpResult,
         InsertWriteOpResult, DeleteWriteOpResultObject } from 'mongodb';

import { Problem, KeyValPair } from './schema';

export class ProblemRepo {
    constructor(private collection: Collection<Problem>) { }

    public insertOne(problem: Problem): Promise<InsertOneWriteOpResult> {
        return this.collection.insertOne(problem);
    }

    public insertMany(problems: Problem[]): Promise<InsertWriteOpResult> {
        return this.collection.insertMany(problems);
    }

    public find(pairs: KeyValPair[]): Cursor<Problem> {
        let query: any = {};
        if (pairs.length > 0) {
            query = {
                '$and': pairs.map(pair => {
                    return {'tags.key': pair.key, 'tags.value': pair.value};
                })
            };
        }
        return this.collection.find(query).map(p => new Problem(p));
    }

    public deleteMany(pairs: KeyValPair[]): Promise<DeleteWriteOpResultObject> {
        return this.collection.deleteMany({});
    }
}