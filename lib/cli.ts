#!/usr/bin/env node

import * as program from 'commander';
import * as readline from 'readline';
const repl = require('repl');

import { GlobalRepoPromise, ProblemRepo } from './problemRepo';
import { ProblemParser } from './problemParser';
import { Problem } from './schema';
import { makePairs } from './common';
import { GlobalSageServer } from './sageServer';

const bufferLimit = 1000;

async function insert(repo: ProblemRepo, files: string[]): Promise<void> {
    const buffer: Problem[] = [];
    const parser = ProblemParser(...files);
    let rval: IteratorResult<Problem | Error> = {done: false, value: null};
    while (!rval.done) {
        while (buffer.length < bufferLimit) {
            rval = parser.next();
            if (rval.value) {
                if (rval.value.constructor === Error) {
                    console.error(rval.value);
                    return;
                }
                buffer.push(rval.value as Problem);
            }
            if (rval.done) break;
        }
        await repo.insertMany(buffer);
    }
}

async function find(repo: ProblemRepo, tags: string[]) {
    const pairs = makePairs(tags);
    let count = 0;
    await repo.find(pairs).forEach(problem => {
        count += 1;
        console.log(problem.toString());
    });
    console.log(`Found ${count} problem${count == 1 ? '' : 's'}.`);
}

async function del(repo: ProblemRepo, tags: string[]) {
    const pairs = makePairs(tags);
    const problems = await repo.find(pairs).toArray();
    if (0 === problems.length) {
        console.log('No problems were found which matched your query.');
        return;
    }
    problems.forEach(problem => console.log(problem.toString()));
    const rl = readline.createInterface({
        input: process.stdin, output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question('Delete all of these problems? (y/N) ', answer => {
            if (answer.trim().toLocaleLowerCase().startsWith('y')) {
                console.log('Proceeding with delete.');
                repo.deleteMany(problems.map(problem => problem._id)).then(() => {
                    rl.close();
                    resolve()
                });
            } else {
                console.log('Aborting delete.');
                rl.close();
                resolve();
            }
        })
    });
}

function sageShell(): Promise<void> {
    const server = repl.start({
        prompt: 'sage: ',
        eval: function(cmd: string, context: any, filename: string, callback: Function): any {
            GlobalSageServer.execute(cmd)
                .then((result: Object) => callback(null, result))
                .catch((err: Error) => callback(err.message));
        }
    });
    return new Promise(resolve => server.on('exit', () => resolve()));
}

type IOptions = {[key: string]: any};

interface IAction {
    command: string;
    options: IOptions;
}

async function main(argv: string[]) {
    const repo = await GlobalRepoPromise;
    let action: IAction = { command: 'default', options: {} };
    program.version('0.0.1');
    program.command('find [tags...]')
        .description('Find all problems with each of the given tags.')
        .action((tags: string[]) => {
            action = { command: 'find', options: {tags: tags} };
        });
    program.command('insert [files...]')
        .description('Insert all problems from each given file.')
        .action((files: string[]) => {
            action = { command: 'insert', options: {files: files} };
        });
    program.command('delete [tags...]')
        .description('Delete problems with all of the given tags.')
        .action((tags: string[]) => {
            action = { command: 'delete', options: {tags: tags} };
        });
    program.command('sageShell')
        .description('Launch a shell that will interpret sage commands.')
        .action(() => {
            action = { command: 'sageShell', options: {} };
        })
    program.parse(argv);
    switch (action.command) {
        case 'insert':
            await insert(repo, action.options.files);
            break;
        case 'find':
            await find(repo, action.options.tags);
            break;
        case 'delete':
            await del(repo, action.options.tags);
            break;
        case 'sageShell':
            await sageShell();
            break;
        default:
            throw new Error('unknown command');
    }

}

main(process.argv)
    .then(_ => process.exit(0))
    .catch(err => {
        console.log(err.message);
        process.exit(1);
    });
