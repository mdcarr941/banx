import { Collection, Cursor, InsertOneWriteOpResult,
         DeleteWriteOpResultObject } from 'mongodb';

import { Problem, KeyValPair } from './schema';

export class ProblemRepo {
    constructor(private collection: Collection<Problem>) { }

    public insertOne(problem: Problem): Promise<InsertOneWriteOpResult> {
        return this.collection.insertOne(problem);
    }

    public insertMany(problems: Problem[]) {
        return this.collection.insertMany(problems);
    }

    public find(pairs: KeyValPair[]): Cursor<Problem> {
        if (pairs.length > 0) {
            return this.collection.find({
                '$and': pairs.map(pair => {
                    return {'tags.key': pair.key, 'tags.value': pair.value}
                })
            });
        }
        return this.collection.find();
    }

    public deleteMany(pairs: KeyValPair[]): Promise<DeleteWriteOpResultObject> {
        return this.collection.deleteMany({});
    }
}