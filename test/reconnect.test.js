const test = require('node:test');
const assert = require('node:assert/strict');
const { HisClient } = require('../src/his-client');

test('tự đăng nhập lại một lần khi HIS trả Session is NULL', async () => {
  let logins = 0;
  let queries = 0;
  const fetchImpl = async (_url, options) => {
    const payload = JSON.parse(options.body);
    const response = payload.func === 'doLogin'
      ? (logins++, { error_code: 0, result: JSON.stringify({ UUID: `uuid-${logins}` }) })
      : (queries++, queries === 1
        ? { error_code: 2, error_msg: 'Session is NULL', result: 'session=NULL' }
        : { error_code: 0, result: '[{"col1":"ok"}]' });
    return { ok: true, text: async () => JSON.stringify(response) };
  };
  const client = new HisClient({ hospitalUrl: 'https://example.test/RestService', fetchImpl });
  await client.login('gateway-user', 'secret');
  client.rememberCredentials('gateway-user', 'secret');
  const result = await client.executeCtlSql('PTO_01', [{ name: '[0]', value: '1' }]);
  assert.equal(logins, 2);
  assert.equal(queries, 2);
  assert.equal(result[0].col1, 'ok');
  client.logout();
  assert.equal(client.session, null);
  assert.equal(client.credentials, null);
});
