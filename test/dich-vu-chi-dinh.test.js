const test = require('node:test');
const assert = require('node:assert/strict');
const { execute } = require('../src/modules/dich-vu-chi-dinh');

test('dịch vụ chỉ định gọi riêng ctl_sql CLS và thuốc vật tư', async () => {
  const calls = [];
  const hisClient = { async executeCtlSqlO(...args) { calls.push(args); return calls.length === 1 ? [{ LOAIDICHVU: 'XET_NGHIEM' }] : [{ LOAIDICHVU: 'THUOC' }]; } };
  const result = await execute({ body: { khambenhid: '1334499' }, hisClient });
  const options = [{ name: '[0]', value: '1334499' }];
  assert.deepEqual(calls, [['CLS_CHIDINH_VPC', options], ['THUOCVT_CD_VPC', options]]);
  assert.deepEqual(result, { data: { cls: [{ LOAIDICHVU: 'XET_NGHIEM' }], thuocVatTu: [{ LOAIDICHVU: 'THUOC' }] }, meta: { khambenhid: '1334499', clsCount: 1, thuocVatTuCount: 1 } });
});

test('dịch vụ chỉ định từ chối ID không hợp lệ', async () => {
  await assert.rejects(() => execute({ body: { khambenhid: '1 OR 1=1' }, hisClient: {} }), (error) => error.code === 'INVALID_CLINICAL_SERVICE_INPUT');
});
