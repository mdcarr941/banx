import { ObjectID } from 'mongodb';

import { Problem } from './schema';
import { GlobalSageServer, SageVariables } from './sageServer';
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

    private async getProblem(problemId: string): Promise<Problem> {
        const repo = await this.getRepo();
        const problem = await repo.getProblem(problemId);
        return problem;
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

    private static sageVarRgx = /\\sage{([^}]*)}/g;

    private static replaceVars(content: string, vars: SageVariables) {
        return content.replace(
            ProblemGenerator.sageVarRgx,
            (match: string, varName: string) => vars[varName]
        );
    }

    public async getInstance(problemId: string): Promise<Problem> {
        const problem = await this.getProblem(problemId);

        const partition = ProblemGenerator.extractCode(problem);
        if (!partition.code) return problem;

        const vars = await GlobalSageServer.execute(partition.code);
        problem.content = ProblemGenerator.replaceVars(partition.content, vars);
        return problem;
    }

    public async getInstances(problemId: string, numInstances: number): Promise<Problem[]> {
        const problem = await this.getProblem(problemId);

        const partition = ProblemGenerator.extractCode(problem);
        if (!partition.code) return [problem];

        let promises: Promise<SageVariables>[] = [];
        for (let k = 0; k < numInstances; ++k) {
            promises.push(GlobalSageServer.execute(partition.code));
        }

        const allVars = await Promise.all(promises);
        const instances: Problem[] = [];
        for (let k = 0; k < numInstances; ++k) {
            instances.push(new Problem({
                tags: problem.tags,
                content: ProblemGenerator.replaceVars(partition.content, allVars[k])
            }));
        }
        return instances;
    }
}

export const GlobalProblemGenerator = new ProblemGenerator();