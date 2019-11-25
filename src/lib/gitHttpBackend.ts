
// This file contains classes for spawning git-http-backend as a CGI
// script and returning its output to the client.

import { spawn } from 'child_process';
import * as express from 'express';

import config from './config';
import { LineStream } from './sageServer';

type Headers = {[name: string]: string};

class CgiStream extends LineStream {
    private readonly headers: Headers = {};
    private readonly headerHandler: (line: string) => void;
    private static readonly headerSplitter = /([-a-zA-Z0-9]+):(.*)/

    constructor(options?: any) {
        super(options);
        this.headerHandler = (_line: Object) => {
            const line = _line.toString();
            // Stop building headers after the first blank line.
            if (0 === line.trim().length) {
                this.removeListener('data', this.headerHandler);
                this.emit('headers', this.headers);
            }
            else {
                const match = CgiStream.headerSplitter.exec(line);
                if (!match) throw new Error(`Failed to parse header: '${line}'`);
                this.headers[match[1]] = match[2].trim();
            }
        }
        this.on('data', this.headerHandler);
    }
}

export function gitHttpBackend(req: express.Request, res: express.Response, next: express.NextFunction) {
    const env = Object.freeze({
        GIT_PROJECT_ROOT: config.repoDir,
        GIT_HTTP_EXPORT_ALL: '',
        PATH_INFO: req.url,
        //REMOTE_USER: req.banxContext.remoteUser.glid,
        REMOTE_ADDR: req.ip,
        CONTENT_TYPE: req.headers['content-type'],
        QUERY_STRING: req.query,
        REQUEST_METHOD: req.method
    });
    const subproc = spawn(config.gitHttpBackend, {
        env: env
    });
    subproc.on('error', (err) => {
        console.error('An error occured while starting git-http-backend:');
        console.error(err);
        res.sendStatus(500);
    });
    subproc.on('exit', (code, signal) => {
        if (code || signal) {
            next(new Error(`${config.gitHttpBackend} exited abnormally. exit code: ${code}, signal number ${signal}`));
        }
    });

    const cgiStream = new CgiStream();
    cgiStream.on('headers', (headers: Headers) => {
        res.statusCode = parseInt(headers.Status) || 200;
        delete headers.Status;
        for (let name in headers) {
            res.setHeader(name, headers[name]);
        }
        // Now that headers and the status code has been set, we can pipe
        // the body directly to the res object.
        cgiStream.pipe(res);
    });
    subproc.stdout.pipe(cgiStream);
    req.pipe(subproc.stdin);
}