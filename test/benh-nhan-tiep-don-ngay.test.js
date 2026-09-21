const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApp } = require('../src/app');

async function withServer(handler, callback) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try { await callback(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test('API tiếp đón chỉ nhận một ngày và truyền đúng tham số ctl_sql', async () => {
  let call;
  const hisClient = { session: { uuid: 'test' }, async executeCtlSqlO(...args) { call = args; return [{ KHAMBENHID: '1334499' }]; } };
  await withServer(createApp({ config: { apiKeys: ['test-key'] }, hisClient }), async (base) => {
    const response = await fetch(`${base}/api/v1/reports/benh-nhan-tiep-don-ngay`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': 'test-key' }, body: JSON.stringify({ ngaytiepnhan: '21/09/2026' }) });
    assert.equal(response.status, 200);
    assert.deepEqual(call, ['NGT002_DSBN_TN_VPC', [{ name: '[0]', value: '21/09/2026' }]]);
    assert.deepEqual(await response.json(), { data: [{ KHAMBENHID: '1334499' }], meta: { count: 1, ngaytiepnhan: '21/09/2026' } });
  });
});

test('API tiếp đón từ chối ngày sai và không nhận khoảng ngày', async () => {
  const hisClient = { session: { uuid: 'test' }, async executeCtlSqlO() { throw new Error('không được gọi'); } };
  await withServer(createApp({ config: { apiKeys: ['test-key'] }, hisClient }), async (base) => {
    const response = await fetch(`${base}/api/v1/reports/benh-nhan-tiep-don-ngay`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': 'test-key' }, body: JSON.stringify({ ngaytiepnhan: '31/02/2026', denNgay: '01/03/2026' }) });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'INVALID_RECEPTION_DATE');
  });
});
