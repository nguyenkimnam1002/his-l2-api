const test = require('node:test');
const assert = require('node:assert/strict');
const { HisClient, parseLoginResponse } = require('../src/his-client');

test('parseLoginResponse đọc UUID từ phản hồi chuẩn', () => {
  const parsed = parseLoginResponse(JSON.stringify({ error_code: 0, result: JSON.stringify({ UUID: 'abc', USERNAME: 'demo' }) }));
  assert.equal(parsed.uuid, 'abc');
});

test('executeCtlSql gửi đúng giao thức ajaxExecuteQuery của kiosk', async () => {
  let sent;
  const fetchImpl = async (_url, options) => { sent = JSON.parse(options.body); return { ok: true, text: async () => JSON.stringify({ error_code: 0, result: '[{"MABENHNHAN":"BN01"}]' }) }; };
  const client = new HisClient({ hospitalUrl: 'https://example.test/RestService', fetchImpl });
  client.session = { uuid: 'session-1' };
  const data = await client.executeCtlSql('PTO_01', [{ name: '[0]', value: '123' }]);
  assert.deepEqual(sent, { func: 'ajaxExecuteQuery', uuid: 'session-1', params: ['', 'PTO_01'], options: [{ name: '[0]', value: '123' }] });
  assert.equal(data[0].MABENHNHAN, 'BN01');
});

test('executeCtlSqlO gửi ajaxExecuteQueryO để nhận cột có tên', async () => {
  let sent;
  const fetchImpl = async (_url, options) => {
    sent = JSON.parse(options.body);
    return { ok: true, text: async () => JSON.stringify({ error_code: 0, result: '[{"MABENHNHAN":"BN01","KHOA":"Khoa khám bệnh"}]' }) };
  };
  const client = new HisClient({ hospitalUrl: 'https://example.test/RestService', fetchImpl });
  client.session = { uuid: 'session-1' };
  const data = await client.executeCtlSqlO('API_DS_KBH_NGAY', [{ name: '[0]', value: '15/09/2026' }, { name: '[1]', value: '15/09/2026' }]);
  assert.equal(sent.func, 'ajaxExecuteQueryO');
  assert.equal(sent.code, 'thu@nnc');
  assert.deepEqual(sent.params, ['', 'API_DS_KBH_NGAY']);
  assert.deepEqual(sent.options, [{ name: '[0]', value: '15/09/2026' }, { name: '[1]', value: '15/09/2026' }]);
  assert.equal(data[0].KHOA, 'Khoa khám bệnh');
});
