import { ChildProcess, spawn } from 'child_process';
import { Stream } from 'stream';
const btoa = require('btoa');

type Timeout = any; // The nodejs Timeout type, which is opaque to me.

const serverPathDefault = '../lib/sage_server.py';
const responseTimeoutMsDefault = 1000;

export interface SageResponse {
    id: string,
    error: boolean,
    result: Object
}

export type SageCallback = (response: Object) => any;

class LineStream extends Stream.Duplex {
    constructor(options: any) {
        super(options);
    }
}

export class SageServer {
    private sub: ChildProcess;

    constructor(
        private serverPath: string = serverPathDefault,
        private responseTimeoutMs: number = responseTimeoutMsDefault
    ) {
        this.spawnSub();
    }

    private listeners: Map<string, [SageCallback, Timeout]> = new Map();

    private spawnSub() {
        this.sub = spawn(this.serverPath);
        this.sub.on('error', err => console.error(`sageServer: error ${err}`));
        this.sub.on('close', code => console.log(`sageServer: subprocess exited with code ${code}.`));
        this.sub.stderr.pipe(process.stderr);
        this.sub.stdout.on('data', (chunk) => {
            console.log('got chunk: ', chunk);
        });
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

    private addListener(id: string, onResponse: SageCallback, onTimeout: Function) {
        const timeout = setTimeout(onTimeout, this.responseTimeoutMs);
        this.listeners.set(id, [onResponse, timeout]);
    }

    public execute(code: string): Promise<Object> {
        const id = this.getId();
        const request = JSON.stringify({msgId: id, code: code}) + '\n';
        const rval: Promise<Object> = new Promise((resolve, reject) => {
            this.listeners.set(id, [result => resolve(result), () => reject()]);
        });
        this.sub.stdin.write(request);
        return rval;
    }
}