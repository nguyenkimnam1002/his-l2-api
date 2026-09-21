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

async function postCatalog(base, path, hisClient) {
  let call;
  const wrappedClient = {
    ...hisClient,
    async executeCtlSqlO(...args) {
      call = args;
      return hisClient.rows;
    }
  };
  let result;
  await withServer(createApp({ config: { apiKeys: ['test-key'] }, hisClient: wrappedClient }), async (url) => {
    const response = await fetch(`${url}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': 'test-key' },
      body: '{}'
    });
    assert.equal(response.status, 200);
    result = await response.json();
  });
  return { call, result };
}

test('API danh mục khoa không nhận tham số và map số giường', async () => {
  const { call, result } = await postCatalog('', '/api/v1/catalogs/khoa', {
    rows: [{ KHOAID: 10, MAKHOA: 'K01', TENKHOA: 'Khoa Cấp cứu', GIUONGKEHOACH: '50', GIUONGTHUCKE: 65 }]
  });
  assert.deepEqual(call, [getApiById('danh-muc-khoa').ctlSql, []]);
  assert.deepEqual(result, {
    data: [{ KhoaId: '10', MaKhoa: 'K01', TenKhoa: 'Khoa Cấp cứu', GiuongKeHoach: 50, GiuongThucKe: 65 }],
    meta: { count: 1 }
  });
});

test('API danh mục phòng trả thêm khoa quản lý', async () => {
  const { call, result } = await postCatalog('', '/api/v1/catalogs/phong', {
    rows: [{ PHONGID: 101, MAPHONG: 'P01', TENPHONG: 'Phòng khám 1', KHOAID: 10, MAKHOA: 'K01', TENKHOA: 'Khoa Cấp cứu' }]
  });
  assert.deepEqual(call, [getApiById('danh-muc-phong').ctlSql, []]);
  assert.deepEqual(result, {
    data: [{ PhongId: '101', MaPhong: 'P01', TenPhong: 'Phòng khám 1', KhoaId: '10', MaKhoa: 'K01', TenKhoa: 'Khoa Cấp cứu' }],
    meta: { count: 1 }
  });
});
