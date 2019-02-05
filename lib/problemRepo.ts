import { Collection, Cursor, InsertOneWriteOpResult,
         InsertWriteOpResult, DeleteWriteOpResultObject,
         FilterQuery } from 'mongodb';

import { Problem, KeyValPair } from './schema';

export class ProblemRepo {
    constructor(private collection: Collection<Problem>) { }

    public insertOne(problem: Problem): Promise<InsertOneWriteOpResult> {
        return this.collection.insertOne(problem);
    }

    public insertMany(problems: Problem[]): Promise<InsertWriteOpResult> {
        return this.collection.insertMany(problems);
    }

    private makeQuery(pairs: KeyValPair[]): FilterQuery<Problem> {
        if (pairs.length > 0) {
            return {
                '$and': pairs.map(pair => {
                    return {'tags.key': pair.key, 'tags.value': pair.value};
                })
            };
        }
        return {};
    }

    public find(pairs: KeyValPair[]): Cursor<Problem> {
        return this.collection.find(this.makeQuery(pairs)).map(p => new Problem(p));
    }

    public deleteMany(pairs: KeyValPair[]): Promise<DeleteWriteOpResultObject> {
        return this.collection.deleteMany(this.makeQuery(pairs));
    }
}