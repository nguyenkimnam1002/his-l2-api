const crypto = require('node:crypto');
const { AppError } = require('../shared/app-error');

class ConnectionRateLimiter {
  constructor({ maxAttempts = 5, windowMs = 60_000, blockMs = 15 * 60_000, now = Date.now } = {}) {
    this.maxAttempts = maxAttempts; this.windowMs = windowMs; this.blockMs = blockMs; this.now = now; this.entries = new Map();
  }
  key(apiKey, ip, username) { return crypto.createHash('sha256').update(`${apiKey}\0${ip}\0${String(username).toLowerCase()}`).digest('hex'); }
  assertAllowed(apiKey, ip, username) {
    const entry = this.entries.get(this.key(apiKey, ip, username));
    if (entry?.blockedUntil > this.now()) throw new AppError('TOO_MANY_CONNECTION_ATTEMPTS', 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau', 429);
  }
  recordFailure(apiKey, ip, username) {
    const key = this.key(apiKey, ip, username); const now = this.now(); let entry = this.entries.get(key);
    if (!entry || now - entry.startedAt >= this.windowMs) entry = { count: 0, startedAt: now, blockedUntil: 0 };
    entry.count += 1; if (entry.count >= this.maxAttempts) entry.blockedUntil = now + this.blockMs; this.entries.set(key, entry);
  }
  recordSuccess(apiKey, ip, username) { this.entries.delete(this.key(apiKey, ip, username)); }
}

module.exports = { ConnectionRateLimiter };
