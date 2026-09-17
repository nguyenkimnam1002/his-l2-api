const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { HisClient } = require('../src/his-client');

test('giữ cookie RestService từ doLogin sang ajaxExecuteQuery', async () => {
  let queryCookie;
  const upstream = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const payload = JSON.parse(Buffer.concat(chunks).toString());
    res.setHeader('Content-Type', 'application/json');
    if (payload.func === 'doLogin') {
      res.setHeader('Set-Cookie', 'JSESSIONID=his-session-1; Path=/; HttpOnly');
      res.end(JSON.stringify({ error_code: 0, result: JSON.stringify({ UUID: 'uuid-1' }) }));
    } else {
      queryCookie = req.headers.cookie;
      res.end(JSON.stringify({ error_code: 0, result: '[{"col1":"ok"}]' }));
    }
  });
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  try {
    const client = new HisClient({ hospitalUrl: `http://127.0.0.1:${upstream.address().port}/RestService` });
    await client.login('demo', 'secret');
    const data = await client.executeCtlSql('PTO_01', [{ name: '[0]', value: '959598' }]);
    assert.equal(queryCookie, 'JSESSIONID=his-session-1');
    assert.equal(data[0].col1, 'ok');
  } finally {
    await new Promise((resolve) => upstream.close(resolve));
  }
});
