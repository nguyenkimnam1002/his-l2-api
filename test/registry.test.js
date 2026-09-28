const test = require('node:test');
const assert = require('node:assert/strict');
const { operations, findHttpOperation, toPublicApi, validateRegistry } = require('../src/registry/operations');
const { RestPushClient } = require('../src/integrations/outbound/rest-push-client');

test('registry tim route HTTP va catalog khong lo cau hinh noi bo', () => {
  const operation = findHttpOperation('POST', '/api/v1/reports/benh-nhan-tiep-don-ngay');
  assert.equal(operation.definition.id, 'benh-nhan-tiep-don-ngay');
  const publicApi = toPublicApi(operation);
  assert.equal(publicApi.path, '/api/v1/reports/benh-nhan-tiep-don-ngay');
  assert.ok(!Object.hasOwn(publicApi, 'execution'));
  assert.ok(!JSON.stringify(publicApi).includes('NGT002_DSBN_TN_VPC'));
});

test('registry chan trung id va route', () => {
  assert.throws(() => validateRegistry([operations[0], operations[0]]), /Trùng operation id/);
});

test('RestPushClient gui API key trong header, khong noi vao URL', async () => {
  let captured;
  const client = new RestPushClient({ fetchImpl: async (url, options) => {
    captured = { url, options };
    return { ok: true, status: 200, text: async () => '{"status":"success"}' };
  } });
  const result = await client.push(
    { url: 'https://receiver.example/api/items', apiKey: 'secret-key' },
    [{ id: 1 }]
  );
  assert.equal(captured.url, 'https://receiver.example/api/items');
  assert.equal(captured.options.headers['x-api-key'], 'secret-key');
  assert.ok(!captured.url.includes('secret-key'));
  assert.deepEqual(result.response, { status: 'success' });
});
