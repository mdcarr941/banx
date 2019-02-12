#!/usr/bin/env sage
"""
This program loops over lines on stdin, parses them as JSON objects,
then executes the code property of the resulting object.
After excution is complete, it responds with the variables which were
in scope when the code terminated, serialized as a JSON object.
"""
from __future__ import print_function
from sage.all import *
from multiprocessing import Process, Queue
from string import Template
import json
import sys
import fileinput
import traceback
import types

Q_SIZE = 4096 # The number of lines in the message queue.
NUM_WORKERS = 8 # The number of worker processes.
PUT_TIMEOUT_SECS = 1 # Seconds to wait for a free slot in the queue.

class IgnoreField():
    """
    An object of this class is used to signify when a field should be omitted
    from a serialized dictionary.
    """
    pass

class JSONEncoderSaged(json.JSONEncoder):
    """A JSONEncoder which is able to handle some types defined in sage."""
    # When ignore is returned by filter(x), x will not be included in the output.
    ignore = IgnoreField()

    def encode(self, o):
        return super(JSONEncoderSaged, self).encode(self.filter(o))

    def is_basic_type(self, o):
        return type(o) in [
            types.StringType, types.UnicodeType, types.IntType, types.LongType,
            types.FloatType, types.BooleanType, types.NoneType
        ]
    
    def filter(self, o):
        if type(o) == types.ListType:
            return self.filter_list(o)
        elif type(o) == types.DictType:
            return self.filter_dict(o)
        elif self.is_basic_type(o):
            return o
        elif type(o) == sage.rings.integer.Integer:
            return int(o)
        elif type(o) == sage.rings.real_mpfr.RealLiteral:
            return float(o)
        else:
            return self.ignore

    def filter_list(self, o):
        new_o = []
        for entry in o:
            entry = self.filter(e)
            if entry != self.ignore:
                new_o.append(entry)
        return new_o

    def filter_dict(self, o):
        new_o = {}
        for key, value in o.items():
            value = self.filter(value)
            if value != self.ignore:
                new_o[key] = value
        return new_o

def compute(code):
    """
    Excutes a string of python code and returns the local variables
    which were in scope when the code exited.
    """
    l = {}
    exec(code, None, l)
    return l

def invertMap(map):
    """Returns a map where the keys and values of the argument have been swapped."""
    inverse = {}
    for key in map:
        inverse[map[key]] = key
    return inverse

# It's important that the values in this dict are all two characters long.
# This is necessary for unescape() to function properly.
ESCAPE_MAP = {
    '"': r'\"',
    '\n': r'\n',
    '\r': r'\r'
}

def escape(s):
    """Perform escaping using ESCAPE_MAP."""
    chars = []
    for char in s:
        try:
            chars.append(ESCAPE_MAP[char])
        except KeyError:
            chars.append(char)
    return ''.join(chars)

UNESCAPE_MAP = invertMap(ESCAPE_MAP)

def unescape(s):
    """Unescape the given string."""
    chars = []
    index = 0
    while index < len(s):
        try:
            chars.append(UNESCAPE_MAP[ s[index:index+2] ])
            index += 2
        except KeyError, IndexError:
            chars.append(s[index])
            index += 1
    return ''.join(chars)

def errorResponse(msgId, result):
    """Respond with an object that has error set to true and the given result."""
    result = escape(result)
    print(Template('{"msgId":"$msgId","error":true,"result":"$result"}')
        .substitute(msgId=msgId, result=result))

def exceptionResponse(msgId, message):
    """Respond with a message concatenated with a stack trace of the last exception."""
    errorResponse(msgId, message + '\n' + traceback.format_exc())

def fullQueueResponse(line):
    """Respond with an error message indicating that the queue is full."""
    try:
        msg = json.loads(line)
    except ValueError:
        msg = {'msgId': None}
    
    try:
        msgId = msg['msgId']
    except KeyError:
        msgId = None

    errorResponse(msgId, 'The queue is full.')

def workerRoutine(q):
    """The loop to be excuted by each worker process."""
    encoder = JSONEncoderSaged()
    while True:
        msgStr = q.get(true) # block until we get something
        msgId = None

        try:
            msg = json.loads(msgStr)
        except ValueError:
            errorResponse(msgId, 'Failed to deserilize JSON.')
            continue

        try:
            msgId = msg['msgId']
            code = unescape(msg['code'])
        except KeyError:
            errorResponse(msgId, 'msg is missing required fields.')
            continue

        try:
            result = compute(code)
        except Exception:
            exceptionResponse(msgId, 'An exception occured while executing user code:')
            continue

        try:
            output = encoder.encode({'msgId': msgId, 'error': False, 'result': result})
        except TypeError, ValueError:
            errorResponse(msgId, 'Failed to serialize result.')
            continue

        print(output)

def main():
    """
    This function creates workers, loops over lines on stdin, and terminates workers
    when finished.
    """
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
            fullQueueResponse(line)
    
    for worker in workers:
        worker.terminate()

if __name__ == '__main__':
    main()
    