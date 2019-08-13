import { Collection, Cursor, InsertOneWriteOpResult,
         InsertWriteOpResult,
         FilterQuery, AggregationCursor, ObjectID } from 'mongodb';

import client from './dbClient';
import { Problem, IProblem, KeyValPair, ProblemIndex } from './schema';
import { mapObj } from './common';



export class ProblemRepo {
    constructor(
        private collection: Collection<IProblem>,
        private indexCollection: Collection<ProblemIndex>
    ) { }

    public getProblem(id: ObjectID): Promise<Problem> {
        return this.collection.findOne({_id: id})
        .then(p => p ? new Problem(p) : null);
    }

    public upsertProblem(problem: Problem): Promise<Problem> {
        return this.collection
        .findOneAndReplace({_id: problem._id}, problem, {upsert: true, returnOriginal: false})
        .then(result => {
            if (1 == result.ok) return new Problem(result.value);
            else throw new Error('upsertProblem failed');
        });
    }

    public getProblems(ids: ObjectID[]): Cursor<Problem> {
        return this.collection.find({_id: {$in: ids}})
        .map(p => new Problem(p));
    }

    public getProblemIndex(): Promise<ProblemIndex> {
        return this.indexCollection.findOne({})
        .then(problemIndex => {
            if (!problemIndex) problemIndex = {_id: undefined, index: {}};
            return problemIndex;
        });
    }

    public updateProblemIndex(problemIndex: ProblemIndex) {
        const query: any = {};
        if (problemIndex._id) query._id = problemIndex._id;
        return this.indexCollection.findOneAndReplace(query, problemIndex, {upsert: true})
        .then(result => result.value);
    }

    public async insertOne(problem: Problem): Promise<InsertOneWriteOpResult> {
        return this.collection.insertOne(problem)
        .then(result =>
            this.updateIndexOnInsert(result.ops.map(p => new Problem(p)))
            .then(() => result)
        );
    }

    public async insertMany(problems: Problem[]): Promise<InsertWriteOpResult> {
        return this.collection.insertMany(problems)
        .then(result =>
            this.updateIndexOnInsert(result.ops.map(p => new Problem(p)))
            .then(() => result)
        );
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

    public deleteOne(id: ObjectID): Promise<Problem> {
        return this.collection.findOneAndDelete({_id: id})
            .then(result =>
                this.updateIndexOnDelete([new Problem(result.value)])
                .then(problems => problems[0])
            );
    }

    public deleteMany(ids: ObjectID[]): Promise<Problem[]> {
        return Promise.all(ids.map(id =>
                this.collection.findOneAndDelete({_id: id}).then(result => new Problem(result.value))
            ))
            .then(problems => this.updateIndexOnDelete(problems));
    }

    public deleteAll(): Promise<any> {
        const problemPromise = this.collection.deleteMany({});
        const indexPromise = this.indexCollection.deleteMany({});
        return Promise.all([problemPromise, indexPromise]);
    }

    public getAllValues(key: string, where: any = null): Promise<string[]> {
        let stages: any[] = [];
        // If a filter clause was specified, do it first.
        if (where) stages.push({ $match: where });
        stages.push(
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
            // Group all documents together and add each array of values to a single array.
            { $group: { _id: null, values: { $addToSet: "$values" }}},
            // Concatenate the arrays in values so that a single array is returned.
            { $project: { _id: 0, values: { $reduce: {
                input: "$values",
                initialValue: [],
                in: { $concatArrays: ["$$value", "$$this"] }
            }}}}
        );
        return this.collection.aggregate(stages).toArray().then((results: any[]) => {
            if (results.length === 0) return [];
            return (<string[]>results[0].values)
                // Remove duplicates.
                .filter((value, index, self) => {
                    return self.indexOf(value) == index;
                });
        });
    }

    public getSubtopics(topic: string): Promise<string[]> {
        return this.getAllValues('Sub', this.makeQuery([{key: 'Topic', value: topic}]));
    }

    public getTags(topic: string, subtopic: string): Promise<Array<{key: string, values: string[]}>> {
        return this.find([
            {key: 'Topic', value: topic},
            {key: 'Sub', value: subtopic}
        ])
        .toArray()
        .then(problems => {
            const obj = problems.map(prob => prob.tags)
            .reduce((all, tags) => all.concat(tags), [])
            .filter((tag, index, arr) => {
                return tag.key !== 'Topic' && tag.key !== 'Sub'
                    && arr.findIndex(t => t.key === tag.key && t.value === tag.value) === index
            })
            .reduce((all: any, tag) => {
                if (!all[tag.key]) all[tag.key] = [];
                all[tag.key].push(tag.value);
                return all;
            }, {});
            return mapObj(obj, (key, val) => {
                return {key: key, values: val}
            });
        });
    }

    public getValues(topic: string, subtopic: string, tag: string): Promise<string[]> {
        return this.getAllValues(tag, this.makeQuery([
            {key: 'Topic', value: topic},
            {key: 'Sub', value: subtopic}
        ]));
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
}

function createProblemRepo() : Promise<ProblemRepo> {
    return Promise.all([client.collection('problems'), client.collection('problemIndex') ])
    .then(results => new ProblemRepo(results[0], results[1]));
}

let GlobalProblemRepo: ProblemRepo = null;
export async function getGlobalProblemRepo(): Promise<ProblemRepo> {
    if (!GlobalProblemRepo) {
        GlobalProblemRepo = await createProblemRepo();
    }
    return GlobalProblemRepo;
}