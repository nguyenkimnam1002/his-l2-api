const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeHospitalDomain, assertPublicHospitalDomain, isPrivateAddress } = require('../src/security/domain-policy');
const { ConnectionManager } = require('../src/connections/connection-manager');

test('domain policy chỉ nhận hostname vncare.vn và chặn IP nội bộ', async () => {
  assert.equal(normalizeHospitalDomain(' BVVINHPHUC.VNCARE.VN. '), 'bvvinhphuc.vncare.vn');
  assert.equal(isPrivateAddress('127.0.0.1'), true);
  assert.equal(isPrivateAddress('10.0.0.5'), true);
  assert.equal(isPrivateAddress('8.8.8.8'), false);
  await assert.rejects(() => assertPublicHospitalDomain('https://bvvinhphuc.vncare.vn'), /không hợp lệ/);
  await assert.rejects(() => assertPublicHospitalDomain('evil.example', { lookup: async () => [{ address: '8.8.8.8' }] }), /không thuộc/);
  await assert.rejects(() => assertPublicHospitalDomain('fake.vncare.vn', { lookup: async () => [{ address: '127.0.0.1' }] }), /không trỏ/);
});

test('connection tách theo API key, lấy hospitalId từ phiên và hủy sạch client', async () => {
  const clients = [];
  const manager = new ConnectionManager({
    lookup: async () => [{ address: '8.8.8.8', family: 4 }],
    hisClientFactory: (hospitalUrl) => {
      const client = { hospitalUrl, loggedOut: false, async login(username) { return { user: { UUID: 'uuid', HID: username === 'admin-a' ? 26030 : 26040, USERNAME: username } }; }, rememberCredentials() {}, logout() { this.loggedOut = true; } };
      clients.push(client); return client;
    }
  });
  const a = await manager.create({ domain: 'bvvinhphuc.vncare.vn', username: 'admin-a', password: 'secret', apiKey: 'partner-a' });
  const b = await manager.create({ domain: 'bvvinhphuc.vncare.vn', username: 'admin-b', password: 'secret', apiKey: 'partner-b' });
  assert.equal(a.hospitalId, '26030'); assert.equal(b.hospitalId, '26040');
  assert.notEqual(a.connectionId, b.connectionId); assert.notEqual(manager.get(a.connectionId, 'partner-a').hisClient, manager.get(b.connectionId, 'partner-b').hisClient);
  assert.throws(() => manager.get(a.connectionId, 'partner-b'), /không thuộc/);
  manager.revoke(a.connectionId, 'partner-a'); assert.equal(clients[0].loggedOut, true); assert.throws(() => manager.get(a.connectionId, 'partner-a'), /không hợp lệ/);
  manager.close();
});

test('connection hết hạn tuyệt đối và hết hạn khi không hoạt động', async () => {
  let now = 1000;
  const manager = new ConnectionManager({ ttlMs: 100, idleMs: 50, now: () => now, lookup: async () => [{ address: '1.1.1.1' }], hisClientFactory: () => ({ async login() { return { user: { HID: 26030 } }; }, rememberCredentials() {}, logout() {} }) });
  const item = await manager.create({ domain: 'benhvienphucyen.vncare.vn', username: 'u', password: 'p', apiKey: 'key' });
  now += 51; assert.throws(() => manager.get(item.connectionId, 'key'), /hết hạn/); manager.close();
});
