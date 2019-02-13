import { ChildProcess, spawn } from 'child_process';
import btoa from 'btoa';

const serverPathDefault = './sage_server.py'

export interface SageResponse {
    id: string,
    error: boolean,
    result: Object
}

export type SageCallback = (response: SageResponse) => any; 

export class SageServer {
    private sub: ChildProcess;

    constructor(private serverPath: string = serverPathDefault) {
        this.spawnSub();
    }

    private listeners: Map<string, [Date, SageCallback]> = new Map();

    private spawnSub() {
        this.sub = spawn(this.serverPath);
        // TODO: Handle errors, pipe closings, etc...
        this.sub.stdout.on('data', (chunk) => {
            //const line = 
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

    public execute(code: string): Object {
        
        return {}
    }
}