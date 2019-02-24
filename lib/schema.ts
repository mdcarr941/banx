import { ObjectID } from 'mongodb';

export interface KeyValPair {
    key: string;
    value: string;
}

export interface IProblem {
    _id?: ObjectID;
    tags?: KeyValPair[];
    content?: string;
}

export class Problem implements IProblem {
    public _id: ObjectID;
    public tags: KeyValPair[] = [];
    public content: string;

    constructor(obj?: IProblem) {
        if (!obj) return;
        this._id = obj._id;
        this.tags = obj.tags;
        this.content = obj.content;
    }

    public values(tag: string): string[] {
        return this.tags.filter(kv => kv.key == tag).map(kv => kv.value);
    }

    public value(tag: string): string {
        const values = this.values(tag);
        if (values.length == 1) {
            return values[0];
        } else if (values.length == 0) {
            throw new Error("Tag not found: " + tag);
        } else {
            throw new Error("Multiple values found for: " + tag);
        }
    }

    public formatTags(): string {
        return this.tags.map(kv => `${kv.key}@${kv.value}`).join(', ');
    }

    public toString(): string {
        return `%%%%%%%%%%%%%%%%%%%%%%%
%%\\taged{${this.formatTags()}}{
${this.content}
%}`;
    }
}

export interface ProblemIndex {
    _id: ObjectID,
    index: {
        [topic: string]: {
            [sub: string]: {
                tags: {
                    [key: string]: {
                        // value points to the number of times that value was used.
                        // This allows for easy updating of this data structure.
                        [value: string]: number
                    }
                },
                problems: {
                    // Each problem ID points to the KV pairs of its tags.
                    [problemId: string]: KeyValPair[]
                }
            }
        }
    }
}
// Note that a problemId will appear once for each (topic, subtopic) defined on it.