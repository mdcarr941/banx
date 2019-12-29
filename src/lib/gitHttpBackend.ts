
// This file contains classes for spawning git-http-backend as a CGI
// script and returning its output to the client.

import { spawn } from 'child_process';
import * as express from 'express';

import config from './config';
import { LineStream } from './sageServer';

type Headers = {[name: string]: string};

export class CgiStream extends LineStream {
    private readonly headers: Headers = {};
    private static readonly headerSplitter = /([-a-zA-Z0-9]+):(.*)/

    constructor(options?: any) {
        super(options);
        this.on('data', this.lineHandler);
    }

    private lineHandler(_line: any): void {
        const line = _line.toString();
        // Stop building headers after the first blank line.
        if (0 === line.trim().length) {
            this.removeListener('data', this.lineHandler);
            this.emit('headers', this.headers);
        }
        else {
            const match = CgiStream.headerSplitter.exec(line);
            if (!match) throw new Error(`Failed to parse header: '${line}'`);
            this.headers[match[1]] = match[2].trim();
        }
    }
}

const urlSplitter = /^([^?]*)(\??.*)/;

function splitUrl(url: string) {
    const match = urlSplitter.exec(url);
    return {path: match[1], query: match[2]};
}

function trimStart(text: string, pattern: string): string {
    if (text.startsWith(pattern)) return text.slice(pattern.length);
    else return text;
}

export async function gitHttpBackend(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
    const urlParts = splitUrl(req.url);
    const env = Object.freeze({
        GIT_PROJECT_ROOT: config.repoDir,
        GIT_HTTP_EXPORT_ALL: '',
        PATH_INFO: urlParts.path,
        REMOTE_USER: req.banxContext.remoteUser.glid,
        REMOTE_ADDR: req.ip,
        CONTENT_TYPE: req.headers['content-type'],
        QUERY_STRING: trimStart(urlParts.query, '?'),
        REQUEST_METHOD: req.method
    });
    console.debug('env:');
    console.debug(env);
    const subproc = spawn(config.gitHttpBackend, {
        env: env
    });
    const cgiStream = new CgiStream();

    subproc.on('error', (err) => {
        cgiStream.end();
        console.error('An error occured while starting git-http-backend:');
        console.error(err);
        res.sendStatus(500);
    });
    subproc.on('exit', (code, signal) => {
        if (code || signal) {
            const message = `${config.gitHttpBackend} exited abnormally. exit code: ${code}, signal number ${signal}`;
            console.error(message);
            next(new Error(message));
        }
    });
    
    cgiStream.on('headers', (headers: Headers) => {
        console.debug('headers:');
        console.debug(headers);
        res.statusCode = parseInt(headers.Status) || 200;
        console.debug(`status set: ${res.statusCode}`);
        delete headers.Status;
        res.set(headers);

        cgiStream.pipe(res);
        // const buffer: any[] = [];
        // cgiStream.on('data', chunk => buffer.push(chunk));
        // cgiStream.on('end', () => {
        //     buffer.forEach(chunk => res.write(chunk))
        //     res.end();
        // });
    });
    subproc.stdout.pipe(cgiStream);
    req.pipe(subproc.stdin);
    cgiStream.on('end', () => console.debug('cgiStream ended'))
    cgiStream.on('finish', () => console.debug('cgiStream finished'))
}