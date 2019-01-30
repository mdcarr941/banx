#!/usr/bin/env node

import * as yargs from 'yargs';

import client from './dbClient';
import { ProblemRepo } from './problemRepo';

async function insert(repo: ProblemRepo, args: string[]): Promise<void> {

}

function find(repo: ProblemRepo, args: string[]) {
    const pairs = args.map(s => s.split('@')).map(p => {
        return { key: p[0], value: p[1] };
    });
    return new Promise((resolve, reject) => {
        repo.find(pairs).toArray((err, problems) => {
            if (err) reject();
            console.log(`Found ${problems.length} problem${problems.length == 1 ? '' : 's'}.`);
            problems.forEach(problem => console.log(problem.toString()));
            resolve();
        });
    });
}

async function main(argv: string[]) {
    const collection = await client.collection();
    const repo = new ProblemRepo(collection);
    yargs.command({
        command: 'find [args...]',
        describe: 'Find problems with the given tags.',
        builder: function(yargs) {
            return yargs;
        },
        handler: async function(argv) {
            await find(repo, argv.args as string[]);
        }
    })
    .help()
    .argv;
    console.log('finished');
    // const command = argv[0];
    // switch (command) {
    //     case 'insert':
    //         await insert(repo, argv.slice(1));
    //     case 'find':
    //         await find(repo, argv.slice(1));
    //     default:
    //         throw new Error('unknown command: ' + command);
    // }
}

main(process.argv)
    .then(_ => process.exit(0))
    .catch(err => {
        console.log(err.message);
        process.exit(1);
    });