import { ChildProcess, spawn } from 'child_process';
const btoa = require('btoa');

const serverPathDefault = '../lib/sage_server.py';

export interface SageResponse {
    id: string,
    error: boolean,
    result: Object
}

export type SageCallback = (response: Object) => any;

export class SageServer {
    private sub: ChildProcess;

    constructor(private serverPath: string = serverPathDefault) {
        this.spawnSub();
    }

    private listeners: Map<string, [number, SageCallback]> = new Map();

    private spawnSub() {
        this.sub = spawn(this.serverPath);
        this.sub.on('error', err => console.error(err));
        // TODO: Handle errors, pipe closings, etc...
        this.sub.stdout.on('data', (chunk) => {
            console.log('got chunk: ', chunk);
        })
    }

    private idCounter = 0;
    private idTimestamp = Date.now();
    private idCounterResetInterval = 100; // in milliseconds

    private getId(): string {
        const now = Date.now();
        if (now - this.idTimestamp >= this.idCounterResetInterval) {
            this.idCounter = 0;
            this.idTimestamp = now;
        }
        const output = btoa(now.toString() + this.idCounter.toString());
        this.idCounter += 1;
        return output;
    }

    private addListener(id: string, callback: SageCallback) {
        this.listeners.set(id, [Date.now(), callback]);
    }

    public execute(code: string): Promise<Object> {
        const id = this.getId();
        const request = JSON.stringify({msgId: id, code: code});
        const rval: Promise<Object> = new Promise((resolve, reject) => {
            this.addListener(id, result => resolve(result));
        });
        console.log('sending: ', request);
        this.sub.stdin.write(request);
        return rval;
    }
}