const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApp } = require('../src/app');
const { HisError } = require('../src/his-client');
const { getApiById } = require('../src/catalog');

test('các API hiện tại đều đang hoạt động', () => {
  assert.equal(getApiById('pto-01').status, 'Đang hoạt động');
  assert.equal(getApiById('kham-benh-ngay').status, 'Đang hoạt động');
  assert.equal(getApiById('danh-muc-dich-vu').status, 'Đang hoạt động');
  assert.equal(getApiById('danh-muc-khoa').status, 'Đang hoạt động');
  assert.equal(getApiById('danh-muc-phong').status, 'Đang hoạt động');
});

async function withServer(handler, callback) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try { await callback(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test('PTO_01 validate API key và map tham số [0]', async () => {
  let call;
  const hisClient = { session: { uuid: 'x' }, executeCtlSql: async (...args) => { call = args; return [{ HOSOBENHANID: 12 }]; } };
  await withServer(createApp({ config: { apiKeys: ['test-key'] }, hisClient }), async (base) => {
    const unauthorized = await fetch(`${base}/api/v1/medical-records/pto-01`, { method: 'POST', headers: {'content-type':'application/json'}, body: '{"hosobenhanid":"12"}' });
    assert.equal(unauthorized.status, 401);
    const response = await fetch(`${base}/api/v1/medical-records/pto-01`, { method: 'POST', headers: {'content-type':'application/json','x-api-key':'test-key'}, body: '{"hosobenhanid":"12"}' });
    assert.equal(response.status, 200);
    assert.deepEqual(call, [getApiById('pto-01').ctlSql, [{ name: '[0]', value: '12' }]]);
  });
});

test('API key được đọc ở catalog local, đăng nhập HIS không cần API key đối tác', async () => {
  let remembered;
  const hisClient = {
    session: null,
    logout() { this.session = null; },
    async login(username) { this.session = { uuid: 'uuid', user: { USER_NAME: username } }; return this.session; },
    rememberCredentials(username) { remembered = username; }
  };
  await withServer(createApp({ config: { apiKeys: ['partner-key'] }, hisClient }), async (base) => {
    const key = await fetch(`${base}/api/admin/api-key`).then((response) => response.json());
    assert.equal(key.apiKey, 'partner-key');
    const login = await fetch(`${base}/api/admin/his-session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'his-user', password: 'secret' }) });
    assert.equal(login.status, 200);
    assert.equal(remembered, 'his-user');
  });
});

test('production an endpoint quan tri va thong tin phien HIS', async () => {
  const hisClient = { session: { uuid: 'secret-session', user: { FULL_NAME: 'Admin HIS' } } };
  await withServer(createApp({ config: { apiKeys: ['key'], localAdminEnabled: false }, hisClient }), async (base) => {
    const keyResponse = await fetch(`${base}/api/admin/api-key`);
    assert.equal(keyResponse.status, 404);
    const loginResponse = await fetch(`${base}/api/admin/his-session`, { method: 'POST' });
    assert.equal(loginResponse.status, 404);
    const health = await fetch(`${base}/api/health`).then((response) => response.json());
    assert.deepEqual(Object.keys(health).sort(), ['ok', 'timestamp']);
    assert.ok(!JSON.stringify(health).includes('Admin HIS'));
    assert.ok(!JSON.stringify(health).includes('secret-session'));
  });
});

test('báo cáo khám bệnh chỉ nhận hai ngày và map [0], [1]', async () => {
  let call;
  const hisClient = { session: { uuid: 'uuid' }, executeCtlSqlO: async (...args) => { call = args; return [{ MABENHNHAN: 'BN01' }]; } };
  await withServer(createApp({ config: { apiKeys: ['key'] }, hisClient }), async (base) => {
    const url = `${base}/api/v1/reports/kham-benh-ngay`;
    const headers = { 'content-type': 'application/json', 'x-api-key': 'key' };
    const invalid = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ tuNgay: '31/02/2026', denNgay: '15/09/2026' }) });
    assert.equal(invalid.status, 400);
    const valid = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ tuNgay: '15/09/2026', denNgay: '15/09/2026' }) });
    assert.equal(valid.status, 200);
    assert.deepEqual(call, [getApiById('kham-benh-ngay').ctlSql, [{ name: '[0]', value: '15/09/2026' }, { name: '[1]', value: '15/09/2026' }]]);
  });
});

test('catalog va ket qua API khong cong khai ctlSql', async () => {
  const hisClient = { session: { uuid: 'uuid' }, executeCtlSql: async () => [{ HOSOBENHANID: 12 }] };
  await withServer(createApp({ config: { apiKeys: ['key'] }, hisClient }), async (base) => {
    const catalog = await fetch(`${base}/api/catalog`).then((response) => response.json());
    assert.ok(catalog.data.length > 0);
    assert.ok(catalog.data.every((api) => !Object.hasOwn(api, 'ctlSql')));
    assert.ok(!JSON.stringify(catalog).includes('ctl_sql'));
    const response = await fetch(`${base}/api/v1/medical-records/pto-01`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': 'key' }, body: '{"hosobenhanid":"12"}'
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(result.meta, { count: 1 });
  });
});

test('loi HIS khong lo SQL ID ra client', async () => {
  const hisClient = { session: { uuid: 'uuid' }, executeCtlSql: async () => {
    throw new HisError('Khong chay duoc ctl_sql PTO_01', 502, { sqlId: 'PTO_01' });
  } };
  await withServer(createApp({ config: { apiKeys: ['key'] }, hisClient }), async (base) => {
    const response = await fetch(`${base}/api/v1/medical-records/pto-01`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': 'key' }, body: '{"hosobenhanid":"12"}'
    });
    assert.equal(response.status, 502);
    const result = await response.json();
    assert.ok(!JSON.stringify(result).includes('PTO_01'));
  });
});
