// This is just to get around TypeScript's prohibition of implicity any.
interface IIndexable {
    [key: string]: any;
}

export class Utility {
    constructor() {
        throw new Error("Utitlity is static and must never be instatiated.");
    }

    public static forEach(obj: IIndexable, callback: (key: any, val: any) => any): void {
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) callback(key, obj[key]);
        }
    }

    public static copyFields(target: IIndexable, source: Object): void {
        Utility.forEach(source, (key: string, val: any) => {
            target[key] = val;
        })
    }
}