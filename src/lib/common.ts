import { KeyValPair, Problem } from './schema';

interface IIndexable {
    [key: string]: any;
}

export function forEach(obj: IIndexable, callback: (key: any, val: any) => any): void {
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) callback(key, obj[key]);
    }
}

export function mapObj(obj: IIndexable, callback: (key: string, val: any, obj: any) => any): any[] {
    const output = [];
    forEach(obj, (key, val) => output.push(callback(key, val, this)));
    return output;
}

export function copyFields(target: IIndexable, source: Object): void {
    forEach(source, (key: string, val: any) => {
        target[key] = val;
    })
}

export function makePairs(tags: string[]): KeyValPair[] {
    return tags.map(s => s.split('@')).map(p => {
        return { key: p[0], value: p[1] };
    });
}

const sepRgx = /,[ \t]*|[ \t]+/g;

export function parseTagString(tagString: string): KeyValPair[] {
    return makePairs(tagString.split(sepRgx));
}

export function joinPairs(pairs: KeyValPair[]): string[] {
    return pairs.map(p => p.key + '@' + p.value);
}

export function printError(err: Error, message?: string) {
    if (!message || 0 == message.length) message = "An error occured";
    console.error(`${message}\n${err.message}`);
}

function segmentFilter(segment: string, index: number, array: Array<string>): boolean {
    return segment.length > 0 || index == 0 || index == array.length - 1;
}

export function cleanPrefix(prefix: string): string {
    return prefix.split('/').filter(segmentFilter).join('/');
}

export function urlJoin(...args: string[]) {
    return args.map(arg => arg.split('/'))
    .reduce((accum, current) => accum.concat(current))
    .filter(segmentFilter)
    .join('/');
}

const startRgx = /%+\s*\\tagged{([^}]+)}\s*{/;
const endRgx = /%\s*}/;
const lineSepRgx = /\n|\r\n|\r/;

export function problemStringParser(block: string): Problem[] {
    const lines = block.split(lineSepRgx);

    let current: Problem;
    let result: RegExpExecArray;
    const problems: Problem[] = [];
    for (let line of lines) {
        /* If current is not null or undefined, then we are looking for the closing
         * bracket of the tag. */
        if (current) {
            if ( (result = endRgx.exec(line)) ) {
                current.content += '\n' + line.slice(0, result.index);
                problems.push(current);
                current = null;
            } else {
                current.content += '\n' + line;
            }
        /* Otherwise we have not yet found the opening bracket of a tagged question. */
        } else {
            if ( (result = startRgx.exec(line)) ) {
                let tags = result[1].split(/,\s*/).map(t => t.split('@')).map(p => {
                    return { key: p[0], value: p[1] };
                });
                current = new Problem({tags: tags, content: ''});
            }
        }
    }
    return problems;
}