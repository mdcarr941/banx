describe('cgiStream', function() {
    const CgiStream = require('../bin/gitHttpBackend').CgiStream;
    const lf = '\n';

    let stream;
    let headers;
    let lines;

    function formatHeader(name, value) {
        return `${name}: ${value}\r\n`;
    }

    beforeEach(function() {
        stream = new CgiStream();
        headers = null;
        lines = [];
        stream.on('data', line => {
            lines.push(line.toString());
        });
        stream.on('headers', _headers => {
            headers = _headers;
        });
    });

    it('should emit headers after the first empty line', function() {
        const header0name = 'Expires';
        const header0value = 'Fri, 01 Jan 1980 00:00:00 GMT'
        const header1name = 'Pragma';
        const header1value = 'no-cache';
        stream.write(formatHeader(header0name, header0value));
        stream.write(formatHeader(header1name, header1value));
        stream.write(lf);

        expect(headers !== null).toBe(true);
        expect(headers[header0name]).toBe(header0value);
        expect(headers[header1name]).toBe(header1value);
        expect(lines.length).toBe(3);
        expect(lines[0]).toBe(formatHeader(header0name, header0value));
        expect(lines[1]).toBe(formatHeader(header1name, header1value));
        expect(lines[2]).toBe(lf);
    });

    it('should emit lines after header has been emitted', function() {
        const headerName = 'Content-Type';
        const headerValue = 'text/plain';
        stream.write(formatHeader(headerName, headerValue));
        stream.write(lf);
        const bodyLine = '59e91bb8090706a9ad5960c4486749d4d4886224	refs/heads/master' + lf;
        stream.write(bodyLine);

        expect(headers !== null).toBe(true);
        expect(headers[headerName]).toBe(headerValue);
        expect(lines.length).toBe(3);
        expect(lines[0]).toBe(formatHeader(headerName, headerValue));
        expect(lines[1]).toBe(lf);
        expect(lines[2]).toBe(bodyLine);
    });

    it('should emit remaining data if end is called', function() {
        const headerName = 'Content-Length';
        const headerValue = '59';
        stream.write(formatHeader(headerName, headerValue));
        stream.write(lf);
        const bodyLine = '59e91bb8090706a9ad5960c4486749d4d4886224	refs/heads/master';
        stream.write(bodyLine);
        stream.end();

        expect(headers !== null).toBe(true);
        expect(headers[headerName]).toBe(headerValue);
        expect(lines.length).toBe(3);
        expect(lines[0]).toBe(formatHeader(headerName, headerValue));
        expect(lines[1]).toBe(lf);
        expect(lines[2]).toBe(bodyLine);
    });
});