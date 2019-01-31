import * as fs from 'fs';

import { Problem } from './schema';

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
    const startRgx = /%+\s*\\tagged{([^}]+)}\s*{/;
    const endRgx = /%\s*}/;
    let current: Problem;
    let lines: string[];
    let result: RegExpExecArray;
    for (let file of files) {
        lines = fs.readFileSync(file, {encoding: 'utf8'}).split(/\n|\r\n/);
        for (let line of lines) {
            /* If current is not null or undefined, then we are looking for the closing
             * bracket of the tag. */
            if (current) {
                if ( (result = endRgx.exec(line)) ) {
                    current.content += '\n' + line.slice(0, result.index);
                    yield current;
                    current = null;
                } else {
                    current.content += '\n' + line;
                }
            /* Otherwise we have not yet found the opening bracket of a tagged question. */
            } else {
                if ( (result = startRgx.exec(line)) ) {
                    let tags = result[1].split(/,\s*/).map(t => t.split('@')).map(p => {
                        return { key: p[0], value: p[1] };
                    })
                    current = new Problem({tags: tags, content: ''});
                }
            }
        }
    }
}