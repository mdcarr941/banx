#!/usr/bin/env sage
from __future__ import print_function
from sage.all import *
from multiprocessing import Process, Queue
import json
import sys
import fileinput

Q_SIZE = 4096
NUM_WORKERS = 8
PUT_TIMEOUT_SECS = 1 # Seconds to wait for a free slot in the queue.

def compute(code):
    l = {}
    exec(code, None, l)
    return l

def json_print(arg):
    print(json.dumps(arg))

def workerRoutine(q):
    while True:
        try:
            msg = json.loads(q.get(true)) # block until we get something
            result = compute(msg['code'])
            json_print({'msgId': msg['msgId'], 'result': result})
        except Exception as error:
            print(error, file=sys.stderr)

def main():
    q = Queue(Q_SIZE)
    workers = []
    for k in range(NUM_WORKERS):
        worker = Process(target=workerRoutine, args=(q,))
        worker.start()
        workers.append(worker)
    
    for line in fileinput.input():
        try:
            q.put(line, true, PUT_TIMEOUT_SECS)
        except Queue.Full:
            try:
                msg = json.loads(line)
            except Exception:
                msg = {'msgId': None}
            json_print({'msgId': msg['msgId'], 'result': "Error: The queue is full."})
    
    for worker in workers:
        worker.terminate()

if __name__ == '__main__':
    main()
    