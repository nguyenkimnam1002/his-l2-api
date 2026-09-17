const { AppError } = require('../../shared/app-error');

class RestPushClient {
  constructor({ fetchImpl = globalThis.fetch, timeoutMs = 30000 } = {}) {
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async push(target, payload) {
    if (!target?.url || !target?.apiKey) {
      throw new AppError('OUTBOUND_CONFIG_INVALID', 'Thiếu URL hoặc API Key của API nhận', 500);
    }
    let response;
    try {
      response = await this.fetchImpl(target.url, {
        method: target.method || 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': target.apiKey,
          ...(target.headers || {})
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs)
      });
    } catch (error) {
      throw new AppError('OUTBOUND_NETWORK_ERROR', 'Không kết nối được API nhận', 502, error.message);
    }

    const text = await response.text();
    let body = text;
    try { body = text ? JSON.parse(text) : null; } catch { /* API nhận không trả JSON */ }
    if (!response.ok) {
      throw new AppError('OUTBOUND_REJECTED', `API nhận trả HTTP ${response.status}`, 502, body);
    }
    return { success: true, status: response.status, response: body };
  }
}

module.exports = { RestPushClient };
