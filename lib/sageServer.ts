import { ChildProcess, spawn } from 'child_process';
import { Stream } from 'stream';
const btoa = require('btoa');

type Timeout = any; // The nodejs Timeout type, which is opaque to me.

export const serverPathDefault = '../lib/sage_server.py';
export const responseTimeoutMsDefault = 2500;

class LineStream extends Stream.Transform {
    private buffer: string = '';

    constructor(options?: any) {
        super({
            ...options,
            objectMode: false,
            decodeStrings: false
        });
    }

    private getNextLine(): string {
        const index = this.buffer.indexOf('\n');
        if (index < 0) return null;
        const rval = this.buffer.slice(0, index);
        this.buffer = this.buffer.slice(index + 1);
        return rval;
    }

    private pushLines() {
        let nextLine = this.getNextLine();
        while (nextLine) {
            this.push(nextLine);
            nextLine = this.getNextLine();
        }
    }

    _transform(chunk: string, encoding: string, callback: Function) {
        this.buffer += chunk;
        this.pushLines();
        callback(null);
    }

    _flush(callback: Function) {
        this.pushLines();
        if (this.buffer.length > 0) this.push(this.buffer);
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
        this.sub = spawn('python2', [this.serverPath]);
        process.on('exit', () => this.sub.kill());

        this.sub.on('error', err => console.error(`sageServer: error ${err}`));
        this.sub.on('exit', code => {
            console.log(`sageServer: subprocess exited with code ${code}.`)
            this.spawnSub();
        });

        this.sub.stderr.pipe(process.stderr);

        this.lineStream = new LineStream();
        this.sub.stdout.pipe(this.lineStream);
        this.lineStream.on('data', (line: string) => {
            let response: SageResponse;
            try {
                response = JSON.parse(line);
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