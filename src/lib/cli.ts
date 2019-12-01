#!/usr/bin/env node

import * as program from 'commander';
import * as readline from 'readline';
import * as os from 'os';
import * as fs from 'fs';
const repl = require('repl');

import { ProblemRepo, getGlobalProblemRepo } from './problemRepo';
import { UnknownUserError, getGlobalUserRepo } from './userRepo';
import { getGlobalRepoRepo } from './repoRepo';
import { ProblemParser } from './problemParser';
import { Problem, BanxUser, UserRole, UserRoleInverse, Repository } from './schema';
import { makePairs, printError } from './common';
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
    return getGlobalUserRepo()
    .then(userRepo => {
        return userRepo.insert(user)
        .then(() => console.log('User inserted successfully.'))
        .catch(err => printError(err, 'User insertion failed'));
    })
    .catch(err => printError(err, 'Failed to get a UserRepo'));
}

async function userDel(glid: string): Promise<void> {
    return getGlobalUserRepo()
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
    return getGlobalUserRepo()
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
    return getGlobalUserRepo()
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

function userModify(glid: string, roles: UserRole[]): Promise<void> {
    return getGlobalUserRepo()
    .then(repo => {
        return repo.setRoles(glid, roles)
        .then(result => console.log(result ? `Successfully updated ${glid}.` : `Failed to update ${glid}.`))
        .catch(err => printError(err, `An error occured while trying to update ${glid}`));
    })
    .catch(err => printError(err, 'Failed to get the global user repo'));
}

function listTagValues(repo: ProblemRepo, tagKey: string, lineLimit: number = 80): Promise<void> {
    return repo.getAllValues(tagKey)
    .then(values => {
        if (values.length > 0) {
            values = values.map(value => `'${value}'`);
            let output = '';
            let line = '[' + values[0];
            for (let k = 1; k < values.length; k += 1) {
                line += ', ' + values[k];
                if (line.length >= lineLimit) {
                    output += line + os.EOL;
                    line = '';
                }
            }
            output += line + ']';
            console.log(output);
        }
        console.log(`Found ${values.length} values.`);
    })
    .catch(err => printError(err, 'An error occured while executing your request'));
}

function getSubtopics(repo: ProblemRepo, topic: string): Promise<void> {
    return repo.getSubtopics(topic)
    .then(subtopics => {
        console.log(subtopics);
        console.log(`Found ${subtopics.length} subtopic${subtopics.length === 1 ? '' : 's'}`);
    })
    .catch(err => printError(err, `Failed to get the subtopics of topic "${topic}".`));
}

function getTags(repo: ProblemRepo, topic: string, subtopic: string): Promise<void> {
    return repo.getTags(topic, subtopic)
    .then(tags => {
        console.log(tags);
        //console.log(`Found ${tags.length} tag${tags.length === 1 ? '' : 's'}.`);
    })
    .catch(err => printError(err,
        `Failed to get the tags under the topic "${topic}" and the subtopic "${subtopic}".`
    ));
}

async function initRepo(name: string, userIds: string[]): Promise<void> {
    const repoRepo = await getGlobalRepoRepo();
    const repo = new Repository({name: name, userIds: userIds}, fs);
    try {
        await repoRepo.upsert(repo);
        console.log(`Course '${name}' was successfully initialized.`);
    }
    catch (err) {
        console.log(`Failed to initialize course '${name}'.`);
        console.error(err.stack);
    }
}

async function listRepos(): Promise<void> {
    const repoRepo = await getGlobalRepoRepo();
    console.log('Repositories in the database:');
    await repoRepo.list().forEach(name => console.log(name));
}

async function deleteRepo(name: string): Promise<void> {
    const repoRepo = await getGlobalRepoRepo();
    const rl = readline.createInterface({
        input: process.stdin, output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(`Are you sure you want to delete '${name}'? (y/N) `, answer => {
            if (answer.trim().toLocaleLowerCase().startsWith('y')) {
                console.log('Proceeding with delete.');
                repoRepo.del(name).then(success => {
                    if (success) console.log('Delete completed successfully.')
                    else console.log(`A course named '${name}' is not in the database.`)
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

type IOptions = {[key: string]: any};

interface IAction {
    command: string;
    options: IOptions;
}

async function main(argv: string[]) {
    const repo = await getGlobalProblemRepo();
    let action: IAction = { command: 'default', options: {} };
    program.version('0.0.1');
    program.command('find [tags...]')
        .description('Find all problems with each of the given tags.')
        .action((tags: string[]) => {
            action = { command: 'find', options: {tags: tags} };
        });
    program.command('listTagValues <tagKey>')
        .description('List all values of the given tag.')
        .action((tagKey: string) => {
            action = {command: 'listTagValues', options: {tagKey: tagKey} };
        })
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
    program.command('userModify <glid> [roles...]')
        .description('Set the roles of the given user.')
        .action((glid: string, roles: string[]) => {
            action = { command: 'userModify', options: {
                glid: glid,
                roles: roles.map(role => UserRoleInverse[role])
            }};
        });
    program.command('getSubtopics <topic>')
        .description('Get all the subtopics of the given topic.')
        .action((topic: string) => {
            action = { command: 'getSubtopics', options: { topic: topic }};
        });
    program.command('getTags <topic> <subtopic>')
        .description('Get all the tags under the given topic and subtopic, excluding "Topic" and "Sub".')
        .action((topic: string, subtopic: string) => {
            action = { command: 'getTags', options: { topic: topic, subtopic: subtopic }};
        });
    program.command('initCourse <name> [userIds...]')
        .description('Initilize a new course repository.')
        .action((name: string, userIds: string[]) => {
            action = { command: 'initRepo', options: {name: name, userIds: userIds} };
        });
    program.command('listCourses')
        .description('List all the courses in the database.')
        .action(() => {
            action = { command: 'listRepos', options: {} };
        });
    program.command('deleteCourse <name>')
        .description('Delete a course from the database.')
        .action((name: string) => {
            action = { command: 'deleteRepo', options: {name: name} }
        });
    program.parse(argv);
    switch (action.command) {
        case 'insert':
            await insert(repo, action.options.files);
            break;
        case 'find':
            await find(repo, action.options.tags);
            break;
        case 'listTagValues':
            await listTagValues(repo, action.options.tagKey);
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
        case 'userModify':
            await userModify(action.options.glid, action.options.roles);
            break;
        case 'getSubtopics':
            await getSubtopics(repo, action.options.topic);
            break;
        case 'getTags':
            await getTags(repo, action.options.topic, action.options.subtopic);
            break;
        case 'initRepo':
            await initRepo(action.options.name, action.options.userIds);
            break;
        case 'listRepos':
            await listRepos();
            break;
        case 'deleteRepo':
            await deleteRepo(action.options.name);
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
