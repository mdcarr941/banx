import { Collection, Cursor, InsertOneWriteOpResult,
         InsertWriteOpResult,
         FilterQuery, AggregationCursor, ObjectID } from 'mongodb';

import client from './dbClient';
import { Problem, IProblem, KeyValPair, ProblemIndex } from './schema';

export class ProblemRepo {
    private problemIndex: ProblemIndex;

    constructor(
        private collection: Collection<IProblem>,
        private indexCollection: Collection<ProblemIndex>
    ) { }

    static async create(): Promise<ProblemRepo> {
        const problemCollection: Collection<Problem> = await client.collection('problems');
        const indexCollection: Collection<ProblemIndex> = await client.collection('problemIndex');
        return new ProblemRepo(problemCollection, indexCollection);
    }

    public async getProblemIndex(): Promise<ProblemIndex> {
        if (this.problemIndex) return this.problemIndex;
        return this.indexCollection.findOne({}).then(problemIndex => {
            if (!problemIndex) problemIndex = {_id: undefined, index: {}};
            this.problemIndex = problemIndex;
            return problemIndex;
        });
    }

    public async updateProblemIndex(problemIndex: ProblemIndex) {
        const query: any = {};
        if (problemIndex._id) query._id = problemIndex._id;
        return this.indexCollection.findOneAndReplace(query, problemIndex, {upsert: true})
            .then(result => this.problemIndex = result.value);
    }

    private async updateIndexOnInsert(problems: Problem[]): Promise<Problem[]> {
        let madeChanges = false;
        const problemIndex = await this.getProblemIndex();
        
        problems.forEach(problem => {
            problem.tags.filter(tag => tag.key === 'Topic').map(tag => tag.value).forEach(topic => {
                if (!problemIndex.index[topic]) problemIndex.index[topic] = {};
                const topicIndex = problemIndex.index[topic];
                
                problem.tags.filter(tag => tag.key === 'Sub').map(tag => tag.value).forEach(sub => {
                    if (!topicIndex[sub]) topicIndex[sub] = {tags: {}, problems: {}};
                    const subIndex = topicIndex[sub];
                    const filteredTags = problem.tags.filter(tag => tag.key !== 'Topic' && tag.key !== 'Sub');

                    filteredTags.forEach(tag => {
                        if (!subIndex.tags[tag.key]) subIndex.tags[tag.key] = {};

                        const keyIndex = subIndex.tags[tag.key];
                        if (!keyIndex[tag.value]) keyIndex[tag.value] = 1;
                        else keyIndex[tag.value] += 1;
                    });
                    subIndex.problems[problem._id.toHexString()] = filteredTags;
                    madeChanges = true;
                });
            });
        });
        
        if (madeChanges) await this.updateProblemIndex(problemIndex);
        return problems;
    }

    private async updateIndexOnDelete(problems: Problem[]): Promise<Problem[]> {
        let madeChanges = false;
        const problemIndex = await this.getProblemIndex();

        problems.forEach(problem => {
            problem.tags.filter(tag => tag.key == 'Topic').map(tag => tag.value).forEach(topic => {
                const topicIndex = problemIndex.index[topic];
                problem.tags.filter(tag => tag.key == 'Sub').map(tag => tag.value).forEach(sub => {
                    const subIndex = topicIndex[sub];
                    const filteredTags = problem.tags.filter(tag => tag.key !== 'Topic' && tag.key !== 'Sub');

                    filteredTags.forEach(tag => {
                        const keyIndex = subIndex.tags[tag.key];
                        keyIndex[tag.value] -= 1;
                        // If no problem is using this value, then delete it.
                        if (0 == keyIndex[tag.value]) delete keyIndex[tag.value];

                        // If this keyIndex has no values, then delete it.
                        if (0 == Object.keys(subIndex.tags[tag.key]).length)
                            delete subIndex.tags[tag.key];
                    });
                    delete subIndex.problems[problem._id.toHexString()];
                    madeChanges = true;

                    // If only the key "tags" remains, then delete this subIndex.
                    if (1 === Object.keys(subIndex).length) delete topicIndex[sub];
                });
                // If no subIndex remains, delete this topicIndex.
                if (0 === Object.keys(topicIndex).length) delete problemIndex.index[topic];
            });
        });
        
        if (madeChanges) await this.updateProblemIndex(problemIndex);
        return problems;
    }

    public async insertOne(problem: Problem): Promise<InsertOneWriteOpResult> {
        return this.collection.insertOne(problem)
            .then( result => this.updateIndexOnInsert(result.ops.map(p => new Problem(p))).then(() => result) );
    }

    public async insertMany(problems: Problem[]): Promise<InsertWriteOpResult> {
        return this.collection.insertMany(problems)
            .then(result => this.updateIndexOnInsert(result.ops.map(p => new Problem(p))).then(() => result) );
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

    public async deleteOne(id: ObjectID): Promise<Problem> {
        return this.collection.findOneAndDelete({_id: id})
            .then(result => this.updateIndexOnDelete([new Problem(result.value)]).then(problems => problems[0]));
    }

    public async deleteMany(ids: ObjectID[]): Promise<Problem[]> {
        return Promise.all(ids.map( id => this.collection.findOneAndDelete({_id: id}).then(result => new Problem(result.value)) ))
            .then(problems => this.updateIndexOnDelete(problems));
    }

    public async deleteAll(): Promise<any> {
        const problemPromise = this.collection.deleteMany({});
        const indexPromise = this.indexCollection.deleteMany({});
        return Promise.all([problemPromise, indexPromise]);
    }

    public getAllValues(key: string): Promise<string[]> {
        const result: AggregationCursor<any> = this.collection.aggregate([
            // Only consider documents with the tag requested.
            { $match: { "tags.key": key } },
            // Filter those documents' tags so that only the tag requested remains.
            { $project: { tags: { $filter: {
                input: "$tags",
                as: "tag",
                cond: { $eq: ["$$tag.key", key] }
            }}}},
            // Project each tag so that only its value remains.
            { $project: { values: { $map: {
                input: "$tags",
                as: "tag",
                in: "$$tag.value"
            }}}},
            // Group all documents together and add each array of values to the set of all values.
            { $group: { _id: null, values: { $addToSet: "$values" }}},
            // Concatenate the arrays in values so that a single array is returned.
            { $project: { _id: 0, values: { $reduce: {
                input: "$values",
                initialValue: [],
                in: { $concatArrays: ["$$value", "$$this"] }
            }}}}
        ]);
        return new Promise((resolve, reject) => {
            result.toArray((err: any, results: any[]) => {
                if (err) reject(err);
                resolve(results[0].values);
            });
        });
    }
}

export const GlobalRepoPromise = ProblemRepo.create();