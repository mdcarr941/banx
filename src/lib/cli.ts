#!/usr/bin/env node

import * as program from 'commander';
import * as readline from 'readline';
import * as os from 'os';
const repl = require('repl');
import * as child_process from 'child_process';

import { getGlobalProblemRepo } from './problemRepo';
import { UnknownUserError, getGlobalUserRepo } from './userRepo';
import { ProblemParser } from './problemParser';
import { Problem, BanxUser, UserRole, UserRoleInverse } from './schema';
import { makePairs, printError } from './common';
import { GlobalSageServer } from './sageServer';
import { getGlobalRepoRepo, Repository } from './repoRepo';
import config from './config';

const bufferLimit = 1000;

async function getProblem(idStr: string): Promise<void> {
    const repo = await getGlobalProblemRepo();
    const prob = await repo.getProblemByStr(idStr);
    console.log(prob.toString());
}

async function insertProblem(files: string[]): Promise<void> {
    const repo = await getGlobalProblemRepo();
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

async function findProblem(tags: string[]) {
    const repo = await getGlobalProblemRepo();
    const pairs = makePairs(tags);
    let count = 0;
    await repo.find(pairs).forEach(problem => {
        count += 1;
        console.log(problem.toString());
    });
    console.log(`Found ${count} problem${count == 1 ? '' : 's'}.`);
}

/**
 * Ask a yes/no question on the console, returning a promise which resolves
 * with true if the answer starts with y or Y and false otherwise.
 * @param question The question to ask.
 */
function yesNoQuestion(question: string): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin, output: process.stdout
    });
    return new Promise(resolve => {
        rl.question(question + ' (y/N) ', answer => {
            rl.close();
            resolve(answer.trim().toLocaleLowerCase().startsWith('y'));
        });
    });
}

async function deleteProblem(tags: string[]): Promise<void> {
    const repo = await getGlobalProblemRepo();
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

    if (await yesNoQuestion('Delete all of these problems?')) {
        console.log('Proceeding with delete.');
        await repo.deleteMany(problems.map(problem => problem._id));
    }
    else {
        console.log('Aborting delete.');
    }
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

async function listTagValues(tagKey: string, lineLimit: number = 80): Promise<void> {
    const repo = await getGlobalProblemRepo();
    let values: string[];
    try {
        values = await repo.getAllValues(tagKey);
    }
    catch (err) {
        printError(err, 'An error occured while executing your request')
    }

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
}

async function getSubtopics(topic: string): Promise<void> {
    const repo = await getGlobalProblemRepo();
    let subtopics: string[];
    try {
        subtopics = await repo.getSubtopics(topic)
    }
    catch (err) {
        printError(err, `Failed to get the subtopics of topic "${topic}".`)
    }
    console.log(subtopics);
    console.log(`Found ${subtopics.length} subtopic${subtopics.length === 1 ? '' : 's'}`);
}

async function getTags(topic: string, subtopic: string): Promise<void> {
    const repo = await getGlobalProblemRepo();
    let tags: {key: string, values: string[]}[];
    try {
        tags = await repo.getTags(topic, subtopic);
    }
    catch (err) {
        printError(err,
            `Failed to get the tags under the topic "${topic}" and the subtopic "${subtopic}".`
        );
    }

    console.log(tags);
    console.log(`Found ${tags.length} tag${tags.length === 1 ? '' : 's'}.`);
}

async function initRepo(name: string, userIds: string[]): Promise<void> {
    const repoRepo = await getGlobalRepoRepo();
    const repo = new Repository({name: name, userIds: userIds});
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
    if (await yesNoQuestion(`Are you sure you want to delete '${name}'?`)) {
        console.log('Proceeding with delete.');
        const repoRepo = await getGlobalRepoRepo();
        if (await repoRepo.del(name)) {
            console.log('Delete completed successfully.');
        }
        else {
            console.log(`A course named '${name}' is not in the database.`)
        }
    }
    else {
        console.log('Aborting delete.');
    }
}

/**
 * Find all problems in the database which have the exact same content.
 */
async function findDuplicates(): Promise<void> {
    const problemRepo = await getGlobalProblemRepo();
    let pairs;
    try {
        pairs = await problemRepo.findDuplicates();
    }
    catch (err) {
        console.log('An error occurred while finding duplicates.');
        console.error(err);
    }
    for (let pair of pairs) {
        for (let dup of pair[1]) {
            console.log(pair[0]._id + ' is duplicated by ' + dup._id);
        }
    }
    const numDups = pairs.map(pair => pair[1].length)
        .reduce((accum, add) => accum + add, 0);
    console.log(`Found ${numDups} duplicate problems.`);
}

/**
 * Delete all problems which have the exact same content as some other problem.
 */
async function deleteDuplicates(): Promise<void> {
    const problemRepo = await getGlobalProblemRepo();
    const pairs = await problemRepo.findDuplicates();
    const numDups = pairs.map(pair => pair[1].length)
        .reduce((accum, add) => accum + add, 0);
    if (await yesNoQuestion(`Are you sure you want to delete ${numDups} duplicates?`)) {
        console.log('Proceeding with delete...');
        const promises = [];
        for (let pair of pairs) {
            for (let dup of pair[1]) promises.push(problemRepo.deleteOne(dup._id));
        }
        await Promise.all(promises);
    }
    else {
        console.log('Aborting delete.');
    }
}

/**
 * Create a subprocess running a shell and execute `command` in it. If the subprocess
 * exits with a non-zero code then `errHandler` is called with this value.
 * @param command The shell command to execute in the subprocess.
 * @param errHandler Called if the subprocess exits with a non-zero exit code.
 */
function execCommand(command: string, errHandler: (exitCode: number) => Error): Promise<void> {
    const sub = child_process.exec(command);
    sub.stdout.pipe(process.stdout);
    sub.stderr.pipe(process.stderr);
    return new Promise((resolve, reject) => {
        sub.on('exit', exitCode => {
            if (0 == exitCode) resolve();
            else reject(errHandler(exitCode));
        });
    });
}

/**
 * Backup the entire banx database to an archive file. Note that you can change
 * the database which is backed up by setting the MONGO_URI environment variable.
 * @param archiveName The name of the archive file where the database will be saved.
 */
function backup(archiveName: string): Promise<void> {
    return execCommand(
        `mongodump --uri=${config.mongoUri} --archive=${archiveName}`,
        exitCode => new Error(`mongodump exited with an abnormal status: ${exitCode}`)
    );
}

/**
 * Restore the given archive file to the database. Note that you can change the
 * database where the archive is restored to using the MONGO_URI environment variable.
 * @param archiveName The name (or path) of the archive file to restore.
 */
function restore(archiveName: string): Promise<void> {
    return execCommand(
        `mongorestore --uri=${config.mongoUri} --archive=${archiveName}`,
        exitCode => new Error(`mongorestore exited with an abnormal status: ${exitCode}`)
    );
}

type IOptions = {[key: string]: any};

interface IAction {
    command: string;
    options: IOptions;
}

async function main(argv: string[]): Promise<void> {
    let action: IAction = { command: 'default', options: {} };
    program.version('0.0.1');
    program.command('getProblem <idStr>')
        .description('Print the problem with the given ID.')
        .action((idStr: string) => {
            action = { command: 'getProblem', options: {idStr: idStr} }
        });
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
            action = { command: 'deleteRepo', options: {name: name} };
        });
    program.command('findDuplicates')
        .description('Find all of the problems in the database which have the same content, modulo whitespace.')
        .action(() => {
            action = { command: 'findDuplicates', options: {} };
        });
    program.command('deleteDuplicates')
        .description('Delete all of the duplicate problems in the database.')
        .action(() => {
            action = { command: 'deleteDuplicates', options: {} };
        });
    program.command('backup <archiveName>')
        .description('Backup the entire banx database to an archive file.')
        .action((archiveName: string) => {
            action = { command: 'backup', options: {archiveName: archiveName} };
        });
    program.command('restore <archiveName>')
        .description('Restore an archive previously created with the backup command.')
        .action((archiveName: string) => {
            action = { command: 'restore', options: {archiveName: archiveName} };
        });
    program.parse(argv);

    switch (action.command) {
        case 'getProblem':
            await getProblem(action.options.idStr);
            break;
        case 'insert':
            await insertProblem(action.options.files);
            break;
        case 'find':
            await findProblem(action.options.tags);
            break;
        case 'listTagValues':
            await listTagValues(action.options.tagKey);
            break;
        case 'delete':
            await deleteProblem(action.options.tags);
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
            await getSubtopics(action.options.topic);
            break;
        case 'getTags':
            await getTags(action.options.topic, action.options.subtopic);
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
        case 'findDuplicates':
            await findDuplicates();
            break;
        case 'deleteDuplicates':
            await deleteDuplicates();
            break;
        case 'backup':
            await backup(action.options.archiveName);
            break;
        case 'restore':
            await restore(action.options.archiveName);
            break;
        default:
            throw new Error('unknown command');
    }
}

(async function() {
    try {
        await main(process.argv);
    }
    catch (err) {
        printError(err);
        process.exit(1);
    }
    process.exit(0);
})();
