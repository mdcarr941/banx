function partition(text, delim) {
    const output = Array(3);
    const start = text.indexOf(delim);
    if (start >= 0) {
        const end = start + delim.length
        output[0] = text.slice(0, start);
        output[1] = text.slice(start, end);
        output[2] = text.slice(end);
    }
    else {
        output[0] = text;
        output[1] = '';
        output[2] = '';
    }
    return output;
}

describe('lineStream', function() {
    const LineStream = require('../bin/sageServer').LineStream;
    const lf = '\n';
    const crlf = '\r\n';

    let stream;
    let lines;

    beforeEach(function() {
        stream = new LineStream();
        lines = [];
        stream.on('data', line => {
            lines.push(line.toString());
        });
    });

    it('should handle a line at a time', function() {
        const line0 = 'line zero';
        stream.write(line0 + lf);
        const line1 = 'line one';
        stream.write(line1 + lf);

        expect(lines.length).toBe(2);
        expect(lines[0]).toBe(line0);
        expect(lines[1]).toBe(line1);
    });

    it('should handle lines split across data chunks', function() {
        const line0 = 'first:second';
        partition(line0, ':').map(f => stream.write(f));
        stream.write(lf);
        const line1 = 'third;fourth';
        partition(line1, ';').map(f => stream.write(f));
        stream.write(lf);

        expect(lines.length).toBe(2);
        expect(lines[0]).toBe(line0);
        expect(lines[1]).toBe(line1);
    });

    it('should handle multiple lines in a single chunk', function() {
        const line0 = 'first line';
        const line1 = 'second line';
        stream.write(line0 + lf + line1 + lf);

        expect(lines.length).toBe(2);
        expect(lines[0]).toBe(line0);
        expect(lines[1]).toBe(line1);
    });

    it('should emit remaining data when end is called', function() {
        const line0 = 'line zero';
        const line1 = 'this is not terminated by eol';
        stream.write(line0 + lf);
        stream.write(line1);
        stream.end();
        
        expect(lines.length).toBe(2);
        expect(lines[0]).toBe(line0);
        expect(lines[1]).toBe(line1);
    });

    it('should not emit if no eol is encoutered and end has not been called', function() {
        const line0 = 'eol terminated';
        const line1 = 'non eol terminated';
        stream.write(line0 + lf);
        stream.write(line1);

        expect(lines.length).toBe(1);
        expect(lines[0]).toBe(line0);
    });

    it('should be able to emit empty lines', function() {
        stream.write(lf);

        expect(lines.length).toBe(1);
        expect(lines[0]).toBe('');
    });

    it('should handle all types of line delimiters', function() {
        const line0 = 'first line';
        const line1 = 'second line';
        const line2 = 'third line';
        stream.write(line0 + lf);
        stream.write(line1 + crlf);
        stream.write(line2 + crlf);

        expect(lines.length).toBe(3);
        expect(lines[0]).toBe(line0);
        expect(lines[1]).toBe(line1);
        expect(lines[2]).toBe(line2);
    });
});