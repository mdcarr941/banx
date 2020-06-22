import { ChildProcess, spawn } from 'child_process';
import { Stream } from 'stream';
import * as path from 'path';
const btoa = require('btoa');

type Timeout = any; // The nodejs Timeout type, which is opaque to me.

export const serverPathDefault = '../../sage_server.py';
export const responseTimeoutMsDefault = 2500;

export class LineStream extends Stream.Transform {
    private static readonly crlf = Buffer.from([13, 10]);
    private static readonly lf = Buffer.from([10]);
    private buffer: Buffer = Buffer.alloc(0);

    constructor(options?: any) {
        super({
            ...options,
            objectMode: false, // only string and Buffer values may be written
            decodeStrings: true, // decode string values to Buffer values 
            autoDestroy: true // destroy the stream if an error occurs
        });
    }

    private getNextLine(): Buffer {
        let index = this.buffer.indexOf(LineStream.crlf);
        let length = 2;
        if (index < 0) {
            index = this.buffer.indexOf(LineStream.lf);
            length = 1;
        }
        if (index < 0) return null;
        const rval = Buffer.from(this.buffer.slice(0, index + length));
        this.buffer = this.buffer.slice(index + length);
        return rval;
    }

    private emitLines() {
        let nextLine = this.getNextLine();
        while (null !== nextLine) {
            this.emit('data', nextLine);
            nextLine = this.getNextLine();
        }
    }

    _transform(chunk: Buffer, encoding: string, callback: Function) {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        this.emitLines();
        callback(null);
    }

    _flush(callback: Function) {
        this.emitLines();
        if (this.buffer.length > 0) {
            this.emit('data', this.buffer);
        }
        callback(null);
    }
}

interface SageResponse {
    msgId: string,
    error: boolean,
    result: Object
}

type SageCallback = (response: Object) => any;
type SageErrorCallback = (error: Error) => any;

interface SageListener {
    onResponse: SageCallback,
    onError: SageErrorCallback,
    timeout: Timeout
}

export interface SageVariables {
    [name: string]: string;
}

export class SageServer {
    private sub: ChildProcess;
    private lineStream: LineStream;

    constructor(
        private serverPath: string = serverPathDefault,
        private responseTimeoutMs: number = responseTimeoutMsDefault
    ) {
        this.spawnSub();
    }

    private listeners: Map<string, SageListener> = new Map();

    private spawnSub() {
        //this.sub = spawn('python2', [path.join(__dirname, this.serverPath)]);
        this.sub = spawn(path.join(__dirname, this.serverPath));
        process.on('exit', () => this.sub.kill());

        this.sub.on('error', err => console.error(`sageServer: error ${err}`));
        this.sub.on('exit', code => {
            console.log(`sageServer: subprocess exited with code ${code}.`)
            this.spawnSub();
        });

        this.sub.stderr.pipe(process.stderr);

        this.lineStream = new LineStream();
        this.sub.stdout.pipe(this.lineStream);
        this.lineStream.on('data', (line: Buffer) => {
            let response: SageResponse;
            try {
                response = JSON.parse(line.toString('utf8'));
            } catch {
                return;
            }
            const listener = this.listeners.get(response.msgId);
            if (!listener) return; // Nobody cares about this response.
            clearTimeout(listener.timeout);
            if (response.error) listener.onError(new Error(response.result.toString()));
            else listener.onResponse(response.result);
            this.listeners.delete(response.msgId);
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

    private addListener(msgId: string, onResponse: SageCallback, onError: SageErrorCallback) {
        const timeout = setTimeout(
            () => onError(new Error('A timeout occured.')),
            this.responseTimeoutMs
        );
        this.listeners.set(msgId, {onResponse: onResponse, onError: onError, timeout: timeout});
    }

    /**
     * Send a request to the subprocess. The returned promise will resolve when it is
     * safe to continue writing to the subproccess's stdin pipe.
     * @param request {Object} Object to be serialized and sent to the subprocess.
     */
    private async send(request: Object): Promise<void> {
        const line = JSON.stringify(request) + '\n';
        const rval: Promise<void> = new Promise(resolve => {
            if (!this.sub.stdin.write(line)) {
                this.sub.stdin.once('drain', () => resolve());
            } else {
                process.nextTick(() => resolve());
            }
        });
        return rval;
    }

    public async execute(code: string): Promise<SageVariables> {
        const msgId = this.getId();
        const request = {msgId: msgId, code: code}
        const rval: Promise<SageVariables> = new Promise((resolve, reject) => {
            this.addListener(
                msgId,
                (result: SageVariables) => resolve(result),
                err => reject(err)
            );
        });
        await this.send(request);
        return rval;
    }
}

export const GlobalSageServer = new SageServer();
