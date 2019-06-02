const http = require('http')
const port = process.env.PORT || 3001

const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'text/plain');
  var headers = Object.keys(req.headers).map(k => `  ${k}: ${req.headers[k]}`).join('\n')
  res.write(`Headers:\n${headers}\n`);
  res.end(`URL: ${req.url}`);
});

server.listen(port, (err) => {
  if (err) console.error(`Error: ${err}`);
  else console.log(`Listening on ${port}.`);
});
