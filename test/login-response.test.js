const test = require('node:test');
const assert = require('node:assert/strict');
const { parseLoginResponse } = require('../src/his-client');

test('parseLoginResponse hỗ trợ RestService trả user trong mảng', () => {
  const result = parseLoginResponse(JSON.stringify({
    error_code: 0,
    result: JSON.stringify([{ UUID: 'array-uuid', USER_NAME: 'ADMIN' }])
  }));
  assert.equal(result.uuid, 'array-uuid');
  assert.equal(result.user.USER_NAME, 'ADMIN');
});

test('parseLoginResponse báo 401 khi thông tin đăng nhập không tạo được UUID', () => {
  assert.throws(
    () => parseLoginResponse(JSON.stringify({ error_code: 0, result: '[]' })),
    (error) => error.statusCode === 401 && /Tài khoản hoặc mật khẩu/.test(error.message)
  );
});
