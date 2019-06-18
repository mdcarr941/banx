import { KeyValPair } from './schema';
import config from './config';

interface IIndexable {
    [key: string]: any;
}

export function forEach(obj: IIndexable, callback: (key: any, val: any) => any): void {
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) callback(key, obj[key]);
    }
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

export function getGlid(req: any): string {
    return req.headers.ufshib_glid;
}

export function invert(object: any): any {
    const inverse: any = {};
    for (let key in object) {
        if (!object.hasOwnProperty(key)) continue;
        inverse[object[key]] = key;
    }
    return inverse;
}