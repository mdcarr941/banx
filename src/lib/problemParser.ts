import * as fs from 'fs';
import * as path from 'path';

import { Problem } from './schema';
import { problemStringParser } from './common';

const inputRgx = /\\input{([^}]+)}/;

/** Replace the `\input` commands in input with the files they reference.
 *  The file names given to `\input` are interpreted as relative to the directory
 *  containing `file`.
 */
function doImports(content: string, file: string): string {
    const dir = path.dirname(file);
    return content.replace(inputRgx, (match: string, inputFile: string) => {
        return fs.readFileSync(path.join(dir, inputFile), {encoding: 'utf8'});
    })
}

export function* ProblemParser(...files: string[]): IterableIterator<Problem | Error> {
    /* First check that all files exist and are actually files. This way the
       process will fail early if there is a mistake. */
    for (let file of files) {
        try {
            if (!fs.statSync(file).isFile())
                return new Error('Cannot read from path: ' + file);
        } catch(err) {
            return err;
        }
    }

    /* We now read each file one by one, split its contents into lines, then check each line for the
       start of a tagged question. */
    for (let file of files) {
        const problems = problemStringParser(fs.readFileSync(file, {encoding: 'utf8'}));
        for (let problem of problems) {
            yield problem;
        }
    }
}