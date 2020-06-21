#!/usr/bin/env python3
"""
This program loops over lines on stdin, parses them as JSON objects,
then executes the code property of the resulting object.
After excution is complete, it responds with the variables which were
in scope when the code terminated, serialized as a JSON object.
"""
from sage.repl.preparse import preparse_file as sage_preparse_file
import sage.all
from multiprocessing import Process, Queue
from string import Template
import json
import sys
import fileinput
import traceback
#import types
import signal

Q_SIZE = 4096 # The number of lines in the message queue.
OUTQ_SIZE = 4096 # The number of lines in the output queue.
NUM_WORKERS = 4 # The number of worker processes.
PUT_TIMEOUT_SECS = 1 # Seconds to wait for a free slot in the queue.
USER_CODE_DEADLINE = 2 # Seconds to wait for user code to complete.

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
        t = type(o)
        return t is str or t is int or t is float or t is bool or t is None
    
    def filter(self, o):
        if type(o) is list:
            return self.filter_list(o)
        elif type(o) is dict:
            return self.filter_dict(o)
        elif self.is_basic_type(o):
            return o
        elif type(o) == sage.rings.integer.Integer:
            return int(o)
        elif type(o) == sage.rings.real_mpfr.RealLiteral:
            return float(o)
        elif type(o) == sage.rings.rational.Rational:
            return str(o)
        else:
            try:
                return str(o)
            except:
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
            # Ignore variables whose name starts with '_sage'.
            if key.startswith('_sage'):
                continue
            value = self.filter(value)
            if value != self.ignore:
                new_o[key] = value
        return new_o

class TimeoutException(Exception):
    """Thrown when a function exceeds its deadline."""
    pass

def deadline(timeout, *args):
    """Set a deadline for the execution of the decorated function. timeout is in seconds."""
    def decorate(f):
        def handler(signum, fram):
            if signum == signal.SIGALRM:
                raise TimeoutException()

        def new_f(*args):
            signal.signal(signal.SIGALRM, handler)
            signal.alarm(timeout)
            try:
                rval = f(*args)
            finally:
                signal.alarm(0)
            return rval

        new_f.__name__ = f.__name__
        return new_f
    
    return decorate

# These builtin function will not be callable from user code.
BLACKLISTED_BUILTINS = [
    'compile',
    'execfile',
    'eval',
    'file',
    'input',
    'open',
    'raw_input',
    'reload',
    '__import__'
]

def filterBuiltins(base):
    rval = dict(base) # copy base
    builtins = rval['__builtins__']
    newBuiltins = {}
    for key in builtins:
        if not key in BLACKLISTED_BUILTINS:
            newBuiltins[key] = builtins[key]
    rval['__builtins__'] = newBuiltins
    # The symbolic variable 'x' should be available to user code.
    exec('var(\'x\')', rval, {})
    return rval

USER_CODE_GLOBALS = filterBuiltins(sage.all.__dict__)

@deadline(USER_CODE_DEADLINE)
def compute(code):
    """
    Excutes a string of python code and returns the local variables
    which were in scope when the code exited.
    """
    l = {}
    code = sage_preparse_file(code)
    exec(code, USER_CODE_GLOBALS, l)
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
        except (KeyError, IndexError):
            chars.append(s[index])
            index += 1
    return ''.join(chars)

def enqueueResponse(q, line):
    """Put line into q, and print to stderr if something goes wrong."""
    try:
        q.put(line, True, PUT_TIMEOUT_SECS)
    except Queue.Full:
        print("Failed to enqueue a response.", file=sys.stderr)

def errorResponse(q, msgId, result):
    """Respond with an object that has error set to true and the given result."""
    result = escape(result)
    enqueueResponse(q, Template('{"msgId":"$msgId","error":true,"result":"$result"}')
        .substitute(msgId=msgId, result=result))

def exceptionResponse(q, msgId, message):
    """Respond with a message concatenated with a stack trace of the last exception."""
    errorResponse(q, msgId, message + '\n' + traceback.format_exc())

def fullQueueResponse(q, line):
    """Respond with an error message indicating that the queue is full."""
    try:
        msg = json.loads(line)
    except ValueError:
        msg = {'msgId': None}
    
    try:
        msgId = msg['msgId']
    except KeyError:
        msgId = None

    errorResponse(q, msgId, 'The queue is full.')

class WorkerProcess(Process): 
    def __init__(self, q=None, outputQ=None, *args, **kwargs):
        super(WorkerProcess, self).__init__(*args, **kwargs)
        self.q = q
        self.outputQ = outputQ

    def run(self):
        """The loop to be excuted by each worker process."""
        q = self.q
        outputQ = self.outputQ
        encoder = JSONEncoderSaged()
        sage.misc.randstate.set_random_seed()

        while True:
            msgStr = q.get(True) # block until we get something
            msgId = None

            try:
                msg = json.loads(msgStr)
            except:
                errorResponse(outputQ, msgId, 'Failed to deserilize JSON.')
                continue

            try:
                msgId = msg['msgId']
                code = unescape(msg['code'])
            except KeyError:
                errorResponse(outputQ, msgId, 'msg is missing required fields.')
                continue

            try:
                result = compute(code)
            except TimeoutException:
                errorResponse(outputQ, msgId, 'Computation timed out.')
                continue
            except:
                exceptionResponse(outputQ, msgId, 'An exception occured while executing user code:')
                continue

            try:
                output = encoder.encode({'msgId': msgId, 'error': False, 'result': result})
            except (TypeError, ValueError):
                errorResponse(outputQ, msgId, 'Failed to serialize result.')
                continue

            enqueueResponse(outputQ, output)

class OutputProcess(WorkerProcess):
    def run(self):
        """This routine simply pulls lines from the output queue and prints them."""
        outputQ = self.outputQ
        while True:
            line = outputQ.get(True)
            print(line)
            sys.stdout.flush()

def checkWorkers(workers):
    """Check each worker, creating a new one if one was found dead."""
    for k in range(len(workers)):
        worker = workers[k]
        if not worker.is_alive():
            worker = type(worker)(q=worker.q, outputQ=worker.outputQ)
            worker.start()
            workers[k] = worker
    return workers

def terminateWorkers(workers):
    """Terminate the given workers."""
    for worker in workers:
        try:
            worker.terminate()
        except:
            continue

def main():
    """
    This function creates workers, loops over lines on stdin, and terminates workers
    when finished.
    """
    q = Queue(Q_SIZE)
    outputQ = Queue(OUTQ_SIZE)

    # The printer should be the first to start and the last to terminate.
    printer = OutputProcess(outputQ=outputQ)
    printer.start()

    workers = []
    for k in range(NUM_WORKERS):
        worker = WorkerProcess(q=q, outputQ=outputQ)
        worker.start()
        workers.append(worker)
    workers.append(printer)

    def handler(signum, frame):
        terminateWorkers(workers)
        sys.exit(signum)

    signal.signal(signal.SIGTERM, handler)
    signal.signal(signal.SIGINT, handler)

    for line in fileinput.input():
        try:
            q.put(line, True, PUT_TIMEOUT_SECS)
        except Queue.Full:
            fullQueueResponse(outputQ, line)
        workers = checkWorkers(workers)
    
    terminateWorkers(workers)

if __name__ == '__main__':
    main()
    
