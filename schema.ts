export interface KeyValPair {
    key: string;
    value: string;
}

export class Problem {
    constructor(public tags: KeyValPair[], public content: string) { }

    values(tag: string): string[] {
        return this.tags.filter(kv => kv.key == tag).map(kv => kv.value);
    }

    value(tag: string): string {
        const values = this.values(tag);
        if (values.length == 1) {
            return values[0];
        } else if (values.length == 0) {
            throw new Error("Tag not found: " + tag);
        } else {
            throw new Error("Multiple values found for: " + tag);
        }
    }
}