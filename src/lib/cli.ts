#!/usr/bin/env node

import * as program from 'commander';
import * as readline from 'readline';
const repl = require('repl');

import { ProblemRepo } from './problemRepo';
import { UserRepo, UnknownUserError } from './userRepo';
import { ProblemParser } from './problemParser';
import { Problem, BanxUser, UserRole } from './schema';
import { makePairs, printError } from './common';
import { GlobalSageServer } from './sageServer';
import { catchClause } from 'babel-types';

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
    const problems: Problem[] = [];
    await repo.find(pairs).forEach(problem => {
        console.log(problem.toString());
        problems.push(problem);
    });
    if (0 == problems.length) {
        console.log('No problems were found which matched your query.');
        return;
    }

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

async function userAdd(glid: string, roleStrings: string[]): Promise<void> {
    const roles = roleStrings.map(role => {
        switch (role) {
            case 'Admin':
                return UserRole.Admin;
            case 'Author':
                return UserRole.Author;
            default:
                throw new Error(`Unknown role specified: ${role}`);
        }
    });
    const user = new BanxUser({glid: glid, roles: roles});
    return UserRepo.create()
    .then(userRepo => {
        return userRepo.insert(user)
        .then(() => console.log('User inserted successfully.'))
        .catch(err => printError(err, 'User insertion failed'));
    })
    .catch(err => printError(err, 'Failed to get a UserRepo'));
}

async function userDel(glid: string): Promise<void> {
    return UserRepo.create()
    .then(userRepo => {
        return userRepo.del(glid)
        .then(deleted => {
            if (deleted) console.log(`User with glid '${glid}' has been deleted.`);
            else console.log(`No user with glid '${glid}' found.`);
        })
        .catch(err => printError(err));
    })
    .catch(err => printError(err));
}

async function userList(): Promise<void> {
    return UserRepo.create()
    .then(repo => {
        let numUsers = 0;
        return repo.list().forEach(user => {
            console.log(user.toString());
            numUsers += 1;
        })
        .then(() => {
            console.log(`Number of users in the database: ${numUsers}`);
        })
        .catch(err => printError(err));
    })
    .catch(err => printError(err, 'Failed to list users'));
}

async function userInfo(glid: string): Promise<void> {
    return UserRepo.create()
    .then(repo => {
        return repo.get(glid)
        .then(user => console.log(user.toString()))
        .catch(err => {
            if (err instanceof UnknownUserError) {
                console.log(`There is no user with glid '${glid}' in the database.`);
            }
            else printError(err, 'An unknown error occured');
        });
    })
    .catch(err => printError(err));
}

type IOptions = {[key: string]: any};

interface IAction {
    command: string;
    options: IOptions;
}

async function main(argv: string[]) {
    const repo = await ProblemRepo.create();
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
        });
    program.command('userAdd <glid> [roles...]')
        .description('Add a user to the database.')
        .action((glid: string, roles: string[]) => {
            action = { command: 'userAdd', options: {glid: glid, roles: roles}};
        });
    program.command('userDel <glid>')
        .description('Delete a user from the database.')
        .action((glid: string) => {
            action = { command: 'userDel', options: {glid: glid}};
        });
    program.command('userList')
        .description('List the users in the database.')
        .action(() => {
            action = { command: 'userList', options: {} };
        });
    program.command('userInfo <glid>')
        .description('Show information about a particular user.')
        .action((glid: string) => {
            action = { command: 'userInfo', options: {glid: glid}};
        });
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
        case 'userAdd':
            await userAdd(action.options.glid, action.options.roles);
            break;
        case 'userDel':
            await userDel(action.options.glid);
            break;
        case 'userList':
            await userList();
            break;
        case 'userInfo':
            await userInfo(action.options.glid);
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
