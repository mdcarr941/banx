#!/usr/bin/env node
import { SageServer } from './sageServer';

const sageServer = new SageServer();

sageServer.execute('x = next_prime(4)')
    .then((result: any) => {
        console.log(`x = ${result.x}`)
        process.exit(0);
    })
    .catch(err => {
        console.error(`${err}`)
        process.exit(1);
    });