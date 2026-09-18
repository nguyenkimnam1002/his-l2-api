const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApp } = require('../src/app');
const { getApiById } = require('../src/catalog');

async function withServer(handler, callback) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try { await callback(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test('danh mục dịch vụ không nhận tham số và map đúng payload API 3.2', async () => {
  let call;
  const hisClient = {
    session: { uuid: 'uuid' },
    async executeCtlSqlO(...args) {
      call = args;
      return [{ MADV: 'DV-XQ01', TENDV: 'Chụp X-Quang Phổi thẳng', NHOMDV: 'CĐHA' }];
    }
  };

  await withServer(createApp({ config: { apiKeys: ['test-key'] }, hisClient }), async (base) => {
    const response = await fetch(`${base}/api/v1/catalogs/dich-vu`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': 'test-key' },
      body: '{}'
    });
    assert.equal(response.status, 200);
    assert.deepEqual(call, [getApiById('danh-muc-dich-vu').ctlSql, []]);
    assert.deepEqual(await response.json(), {
      data: [{ MaDV: 'DV-XQ01', TenDV: 'Chụp X-Quang Phổi thẳng', NhomDV: 'CĐHA' }],
      meta: { count: 1 }
    });
  });
});

test('danh mục dịch vụ từ chối dữ liệu thiếu nhóm dịch vụ', async () => {
  const hisClient = {
    session: { uuid: 'uuid' },
    async executeCtlSqlO() {
      return [{ MADV: 'DV01', TENDV: 'Dịch vụ thử nghiệm', NHOMDV: null }];
    }
  };

  await withServer(createApp({ config: { apiKeys: ['test-key'] }, hisClient }), async (base) => {
    const response = await fetch(`${base}/api/v1/catalogs/dich-vu`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': 'test-key' },
      body: '{}'
    });
    assert.equal(response.status, 502);
    const result = await response.json();
    assert.equal(result.error.code, 'INVALID_SERVICE_DATA');
  });
});

test('danh mục dịch vụ trả 405 khi Postman gọi nhầm GET', async () => {
  const hisClient = { session: { uuid: 'uuid' } };

  await withServer(createApp({ config: { apiKeys: ['test-key'] }, hisClient }), async (base) => {
    const response = await fetch(`${base}/api/v1/catalogs/dich-vu`, {
      headers: { 'x-api-key': 'test-key' }
    });
    assert.equal(response.status, 405);
    assert.match(response.headers.get('content-type'), /application\/json/);
    const result = await response.json();
    assert.equal(result.error.code, 'METHOD_NOT_ALLOWED');
  });
});
