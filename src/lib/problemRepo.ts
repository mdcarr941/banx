import { Collection, Cursor, InsertOneWriteOpResult,
         InsertWriteOpResult,
         FilterQuery, ObjectID } from 'mongodb';

import client, { NonExistantCollectionError, DbClient } from './dbClient';
import { Problem, IProblem, KeyValPair } from './schema';
import { mapObj } from './common';



export class ProblemRepo {
    public static readonly collectionName = 'problems';

    constructor(
        private readonly collection: Collection<IProblem>
    ) { }

    public getProblem(id: ObjectID): Promise<Problem> {
        return this.collection.findOne({_id: id})
        .then(p => p ? new Problem(p) : null);
    }

    public getProblemByStr(idStr: string) {
        return this.getProblem(ObjectID.createFromHexString(idStr));
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

    public async insertOne(problem: Problem): Promise<InsertOneWriteOpResult> {
        return this.collection.insertOne(problem);
    }

    public async insertMany(problems: Problem[]): Promise<InsertWriteOpResult> {
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

    public deleteOne(id: ObjectID): Promise<Problem> {
        return this.collection.findOneAndDelete({_id: id}).then(r => new Problem(r.value));
    }

    public deleteMany(ids: ObjectID[]): Promise<Problem[]> {
        return Promise.all(ids.map(id =>
                this.collection.findOneAndDelete({_id: id}).then(result => new Problem(result.value))
            ));
    }

    public deleteAll(): Promise<any> {
        return this.collection.deleteMany({});
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

    public getTopics(): Promise<string[]> {
        return this.getAllValues('Topic');
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

    public findDuplicates(): Promise<Array<[Problem, Problem[]]>> {
        return this.collection.find()
        .map(
            iprob => this.collection
            .find({
                _id: {$ne: iprob._id},
                content: iprob.content
            })
            .toArray()
            .then(dups => <[Problem, Problem[]]>[new Problem(iprob), dups.map(x => new Problem(x))])
        )
        .toArray()
        .then(promises => Promise.all(promises))
    }
}

async function makeProblemsCollection(client: DbClient): Promise<Collection<IProblem>> {
    const db = await client.db();
    return db.createCollection(ProblemRepo.collectionName);
}

let GlobalProblemRepo: ProblemRepo = null;
export async function getGlobalProblemRepo(): Promise<ProblemRepo> {
    if (!GlobalProblemRepo) {
        let problemCollection: Collection<IProblem>;
        try {
            problemCollection = await client.collection(ProblemRepo.collectionName);
        }
        catch (err) {
            if (err instanceof NonExistantCollectionError) {
                problemCollection = await makeProblemsCollection(client);
            }
            else throw err;
        }
        GlobalProblemRepo = new ProblemRepo(problemCollection);
    }
    return GlobalProblemRepo;
}