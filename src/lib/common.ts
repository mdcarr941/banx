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

const adminArray = config.admins.split(',');
export function isAdmin(userGlid: string) {
    return adminArray.indexOf(userGlid) >= 0;
}

export function printError(err: Error, message?: string) {
    if (!message || 0 == message.length) message = "An error occured";
    console.error(`${message}\n${err.message}`);
}