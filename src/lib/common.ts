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
    const output: any[] = [];
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

// Return true if a segment has positive length or it is at the beginning or end
// of the array. This prevents zero length segments from appearing in the middle of
// a path.
function segmentFilter(segment: string, index: number, array: Array<string>): boolean {
    return segment.length > 0 || index == 0 || index == array.length - 1;
}

export function cleanPrefix(prefix: string): string {
    return prefix.split('/').filter(segmentFilter).join('/');
}

function trimPatternStart(text: string, pattern: string): string {
    if (!text || !pattern) return text;
    else if (text.startsWith(pattern)) return text.slice(pattern.length);
    else return text;
}

function trimPatternEnd(text: string, pattern: string): string {
    if (!text || !pattern) return text;
    else if (text.endsWith(pattern)) return text.slice(0, text.length - pattern.length);
    else return text;
}

function trimPattern(text: string, pattern: string): string {
    return trimPatternEnd(trimPatternStart(text, pattern), pattern);
}

const sep = '/';

export function urlJoin(...args: string[]): string {
    const lastIndex = args.length - 1;
    return args
        .filter(segment => typeof segment === 'string')
        .map((arg, index) => {
            if (0 === index) return trimPatternEnd(arg, sep)
            else if (lastIndex === index) return trimPatternStart(arg, sep);
            else return trimPattern(arg, sep)
        })
        .filter(segmentFilter)
        .join(sep);
}

export function basename(path: string): string {
    if (typeof path !== 'string') return null;
    if ('' === path) return '';
    const fields = path.split(sep).filter(s => s.length > 0);
    if (fields.length > 0) return fields[fields.length - 1];
    else return sep;
}

function removeTrailingSeps(path: string): string {
    let index = path.length - 1;
    while (index >= 0 && path.charAt(index) === sep) {
        index -= 1;
    }
    return path.slice(0, index + 1);
}

export function dirname(path: string): string {
    if (typeof path !== 'string') return null;
    let start: number, end: number = path.length, field: string;
    do {
        start = path.lastIndexOf(sep, end - 1);
        field = path.slice(start + 1, end);
        end = start;
    } while (start >= 0 && field.length === 0)

    if (start >= 0) {
        const sliced = path.slice(0, end);
        if (sliced.length > 0) return removeTrailingSeps(sliced);
    }

    if (path.startsWith(sep)) return sep;
    else return '.';
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