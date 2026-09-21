const crypto = require('node:crypto');
const { AppError } = require('../shared/app-error');
const { assertPublicHospitalDomain, toRestServiceUrl } = require('../security/domain-policy');

const digest = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

class ConnectionManager {
  constructor({ hisClientFactory, ttlMs = 8 * 60 * 60 * 1000, idleMs = 2 * 60 * 60 * 1000, allowedDomainSuffixes, lookup, now = Date.now }) {
    this.hisClientFactory = hisClientFactory;
    this.ttlMs = ttlMs;
    this.idleMs = idleMs;
    this.allowedDomainSuffixes = allowedDomainSuffixes;
    this.lookup = lookup;
    this.now = now;
    this.records = new Map();
    this.timer = setInterval(() => this.cleanup(), Math.min(60_000, Math.max(1_000, idleMs)));
    this.timer.unref?.();
  }

  async create({ domain, username, password, apiKey }) {
    const userName = String(username ?? '').trim();
    const secret = String(password ?? '');
    if (!userName || !secret || userName.length > 128 || secret.length > 512) {
      throw new AppError('INVALID_CONNECTION_INPUT', 'Cần nhập domain, tài khoản và mật khẩu HIS', 400);
    }
    const safeDomain = await assertPublicHospitalDomain(domain, { allowedSuffixes: this.allowedDomainSuffixes, lookup: this.lookup });
    const hisClient = this.hisClientFactory(toRestServiceUrl(safeDomain));
    let session;
    try {
      session = await hisClient.login(userName, secret);
      hisClient.rememberCredentials(userName, secret);
    } catch (error) {
      hisClient.logout?.();
      if (error?.statusCode === 401) {
        throw new AppError('HIS_AUTHENTICATION_FAILED', 'Tài khoản hoặc mật khẩu HIS không đúng, hoặc tài khoản không thuộc bệnh viện này', 401);
      }
      throw new AppError('HIS_SERVICE_UNAVAILABLE', 'Không kết nối được RestService của bệnh viện', 502);
    }
    const user = session.user || {};
    const hospitalId = user.HOSPITAL_ID || user.HID || user.COMPANY_ID || user.CSYTID || user.HOSPITALID;
    if (!hospitalId) {
      hisClient.logout?.();
      throw new AppError('HIS_HOSPITAL_NOT_IDENTIFIED', 'Phiên HIS không trả về mã bệnh viện', 502);
    }
    const connectionId = `hc_${crypto.randomBytes(32).toString('base64url')}`;
    const createdAt = this.now();
    this.records.set(digest(connectionId), {
      apiKeyHash: digest(apiKey), domain: safeDomain, hospitalId: String(hospitalId),
      userName: String(user.USER_NAME || user.USERNAME || userName), fullName: String(user.FULL_NAME || ''),
      hisClient, createdAt, lastUsedAt: createdAt, expiresAt: createdAt + this.ttlMs
    });
    return { connectionId, domain: safeDomain, hospitalId: String(hospitalId), userName: String(user.USER_NAME || user.USERNAME || userName), fullName: String(user.FULL_NAME || ''), expiresAt: new Date(createdAt + this.ttlMs).toISOString() };
  }

  get(connectionId, apiKey) {
    if (!connectionId) throw new AppError('HIS_CONNECTION_REQUIRED', 'Thiếu header X-HIS-Connection-Id', 401);
    const record = this.records.get(digest(connectionId));
    if (!record) throw new AppError('INVALID_HIS_CONNECTION', 'Phiên kết nối HIS không hợp lệ hoặc đã hết hạn', 401);
    const now = this.now();
    if (now >= record.expiresAt || now - record.lastUsedAt >= this.idleMs) {
      this.removeRecord(connectionId, record);
      throw new AppError('HIS_CONNECTION_EXPIRED', 'Phiên kết nối HIS đã hết hạn', 401);
    }
    if (!crypto.timingSafeEqual(Buffer.from(record.apiKeyHash), Buffer.from(digest(apiKey)))) {
      throw new AppError('HIS_CONNECTION_FORBIDDEN', 'Phiên kết nối không thuộc API key này', 403);
    }
    record.lastUsedAt = now;
    return record;
  }

  revoke(connectionId, apiKey) {
    const record = this.get(connectionId, apiKey);
    this.removeRecord(connectionId, record);
  }

  removeRecord(connectionId, record) {
    this.records.delete(digest(connectionId));
    record.hisClient.logout?.();
  }

  cleanup() {
    const now = this.now();
    for (const [key, record] of this.records) {
      if (now >= record.expiresAt || now - record.lastUsedAt >= this.idleMs) {
        this.records.delete(key);
        record.hisClient.logout?.();
      }
    }
  }

  count() { this.cleanup(); return this.records.size; }
  close() { clearInterval(this.timer); for (const record of this.records.values()) record.hisClient.logout?.(); this.records.clear(); }
}

module.exports = { ConnectionManager };
