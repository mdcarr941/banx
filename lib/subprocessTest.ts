#!/usr/bin/env node
import { ChildProcess, spawn } from 'child_process';

const sub: ChildProcess = spawn('../lib/sage_server.py');

sub.stdout.on('data', (data) => {
    process.stdout.write(`stdout: ${data}`);
    sub.kill();
});

sub.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
});

sub.on('close', (code) => {
    console.log(`The child process exited with code ${code}.`);
    process.exit(0);
});

sub.on('error', err => console.log(`An error occured: ${err}`));

sub.stdin.write('{"msgId":1,"code":"x = 2 * 2"}\n', 'utf8');