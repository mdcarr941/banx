import { ObjectID } from 'mongodb';

import { Problem } from './schema';
import { GlobalSageServer } from './sageServer';
import { GlobalRepoPromise, ProblemRepo } from './problemRepo';

interface ContentPartition {
    code?: string;
    content: string;
}

export class ProblemGenerator {
    constructor(private repo?: ProblemRepo) { }

    private async getRepo(): Promise<ProblemRepo> {
        if (!this.repo) {
            this.repo = await GlobalRepoPromise;
        }
        return this.repo;
    }

    private static codeRgx = /\\begin{sagesilent}([\s\S]*)\\end{sagesilent}/

    private static extractCode(problem: Problem): ContentPartition {
        const match = ProblemGenerator.codeRgx.exec(problem.content);
        if (!match) return {content: problem.content};
        return {
            code: match[1],
            content: problem.content.slice(0, match.index)
                + problem.content.slice(match.index + match[0].length)
        };
    }

    private static sageVarRgx = /\\sage{([^}]*)}/g

    public async getInstance(problemId: string): Promise<Problem> {
        const id = ObjectID.createFromHexString(problemId);
        const repo = await this.getRepo();

        const problem = await repo.getProblem(id);
        if (!problem) return problem;

        const partition = ProblemGenerator.extractCode(problem);
        if (!partition.code) return problem;

        const vars = await GlobalSageServer.execute(partition.code);
        problem.content = partition.content.replace(
            ProblemGenerator.sageVarRgx,
            (match: string, varName: string) => vars[varName]
        );
        return problem;
    }
}

export const GlobalProblemGenerator = new ProblemGenerator();