#!/usr/bin/env node

import * as program from 'commander';
import * as readline from 'readline';

import client from './dbClient';
import { ProblemRepo } from './problemRepo';
import { ProblemParser } from './problemParser';
import { Problem, KeyValPair } from './schema';

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

function makePairs(tags: string[]): KeyValPair[] {
    return tags.map(s => s.split('@')).map(p => {
        return { key: p[0], value: p[1] };
    });
}

function find(repo: ProblemRepo, tags: string[]) {
    const pairs = makePairs(tags);
    return new Promise((resolve, reject) => {
        repo.find(pairs).toArray((err, problems) => {
            if (err) reject();
            console.log(`Found ${problems.length} problem${problems.length == 1 ? '' : 's'}.`);
            problems.forEach(problem => console.log(problem.toString()));
            resolve();
        });
    });
}

async function del(repo: ProblemRepo, tags: string[]) {
    const pairs = makePairs(tags);
    const problems = await repo.find(pairs).toArray();
    problems.forEach(problem => console.log(problem.toString()));
    const rl = readline.createInterface({
        input: process.stdin, output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question('Delete all of these problems? ', answer => {
            if (answer.trim().toLocaleLowerCase().startsWith('y')) {
                console.log('Proceeding with delete.');
                repo.deleteMany(pairs);
            } else {
                console.log('Aborting delete.');
            }
            rl.close();
            resolve();
        })
    });
}

type IOptions = {[key: string]: any};

interface IAction {
    command: string;
    options: IOptions;
}

async function main(argv: string[]) {
    const collection = await client.collection();
    const repo = new ProblemRepo(collection);
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