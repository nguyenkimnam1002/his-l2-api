const http = require('node:http');
const https = require('node:https');

class HisError extends Error {
  constructor(message, statusCode = 502, details) {
    super(message);
    this.name = 'HisError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function parsePossibleJson(value) {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
}

function parseLoginResponse(text) {
  let envelope;
  try {
    envelope = JSON.parse(text);
  } catch {
    const code = Number(text.match(/"error_code"\s*:\s*(-?\d+)/)?.[1] ?? -1);
    if (code !== 0) {
      const message = text.match(/"error_msg"\s*:\s*"([^"]*)"/)?.[1];
      envelope = { error_code: code, error_msg: message || 'Đăng nhập HIS thất bại' };
    } else {
      const firstQuote = text.indexOf("'");
      const lastQuote = text.lastIndexOf("'");
      if (firstQuote < 0 || lastQuote <= firstQuote) throw new HisError('Phản hồi đăng nhập HIS không hợp lệ');
      envelope = { error_code: 0, result: parsePossibleJson(text.slice(firstQuote + 1, lastQuote)) };
    }
  }

  if (!envelope || Number(envelope.error_code) !== 0) {
    throw new HisError(envelope?.error_msg || 'Đăng nhập HIS thất bại', 502, envelope);
  }

  const parsedResult = parsePossibleJson(envelope.result);
  const user = Array.isArray(parsedResult)
    ? parsedResult[0]
    : (parsedResult?.data && !parsedResult.UUID && !parsedResult.uuid
      ? (Array.isArray(parsedResult.data) ? parsedResult.data[0] : parsedResult.data)
      : parsedResult);
  const uuid = user?.UUID || user?.uuid || user?.TOKEN || user?.token;
  if (!uuid) {
    throw new HisError(
      'Tài khoản hoặc mật khẩu không đúng, hoặc tài khoản không thuộc hệ thống HIS đang kết nối',
      401
    );
  }
  return { uuid: String(uuid), user };
}

class HisClient {
  constructor({ hospitalUrl, requestTimeoutMs = 30000, rejectUnauthorized = false, fetchImpl = null }) {
    this.hospitalUrl = hospitalUrl;
    this.requestTimeoutMs = requestTimeoutMs;
    this.fetchImpl = fetchImpl;
    this.rejectUnauthorized = rejectUnauthorized;
    this.session = null;
    this.cookies = new Map();
    this.credentials = null;
    this.reconnecting = null;
  }

  async request(payload, responseAsText = false) {
    const body = JSON.stringify(payload);
    let status;
    let text;
    try {
      if (this.fetchImpl) {
        const response = await this.fetchImpl(this.hospitalUrl, {
          method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body,
          signal: AbortSignal.timeout(this.requestTimeoutMs)
        });
        status = response.status || (response.ok ? 200 : 500);
        text = await response.text();
      } else {
        ({ status, text } = await this.postWithNode(body));
      }
    } catch (error) {
      throw new HisError(`Không kết nối được RestService: ${error.cause?.message || error.message}`, 502);
    }
    if (status < 200 || status >= 300) throw new HisError(`RestService trả về HTTP ${status}`, 502, text.slice(0, 500));
    if (responseAsText) return text;
    try { return JSON.parse(text); } catch { throw new HisError('RestService trả về JSON không hợp lệ', 502); }
  }

  postWithNode(body) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.hospitalUrl);
      const transport = url.protocol === 'https:' ? https : http;
      const req = transport.request(url, {
        method: 'POST',
        rejectUnauthorized: this.rejectUnauthorized,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'content-length': Buffer.byteLength(body),
          ...(this.cookies.size ? { cookie: [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ') } : {})
        }
      }, (res) => {
        for (const cookie of res.headers['set-cookie'] || []) {
          const pair = cookie.split(';', 1)[0];
          const separator = pair.indexOf('=');
          if (separator > 0) this.cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve({ status: res.statusCode || 500, text: Buffer.concat(chunks).toString('utf8') }));
      });
      req.setTimeout(this.requestTimeoutMs, () => req.destroy(new Error(`Quá thời gian ${this.requestTimeoutMs}ms`)));
      req.on('error', reject);
      req.end(body);
    });
  }

  async login(username, password) {
    this.session = null;
    this.cookies.clear();
    const text = await this.request({
      func: 'doLogin',
      uuid: '',
      params: ['{?=call prc_login(?2S,?3S)}', username, password]
    }, true);
    this.session = { ...parseLoginResponse(text), createdAt: Date.now() };
    return this.session;
  }

  rememberCredentials(username, password) {
    this.credentials = { username, password };
  }

  logout() {
    this.session = null;
    this.credentials = null;
    this.cookies.clear();
  }

  async reconnect() {
    if (!this.credentials) throw new HisError('Phiên HIS đã hết hạn. Vui lòng đăng nhập lại.', 503);
    if (!this.reconnecting) {
      const { username, password } = this.credentials;
      this.reconnecting = this.login(username, password).finally(() => { this.reconnecting = null; });
    }
    return this.reconnecting;
  }

  async executeCtlSql(sqlId, options, retried = false, namedColumns = false) {
    if (!this.session?.uuid && this.credentials && !retried) await this.reconnect();
    if (!this.session?.uuid) throw new HisError('Gateway chưa có phiên đăng nhập HIS', 503);
    const envelope = await this.request({
      func: namedColumns ? 'ajaxExecuteQueryO' : 'ajaxExecuteQuery',
      ...(namedColumns ? { code: 'thu@nnc' } : {}),
      uuid: this.session.uuid,
      params: ['', sqlId],
      options
    });
    if (Array.isArray(envelope)) return envelope;
    if (!envelope || Number(envelope.error_code) !== 0) {
      if (/session\s+is\s+null|session\s*=\s*null/i.test(`${envelope?.error_msg || ''} ${envelope?.result || ''}`)) {
        this.session = null;
        if (this.credentials && !retried) {
          await this.reconnect();
          return this.executeCtlSql(sqlId, options, true, namedColumns);
        }
        throw new HisError('Phiên HIS đã hết hạn. Vui lòng đăng nhập lại.', 503);
      }
      throw new HisError(envelope?.error_msg || `Không chạy được ctl_sql ${sqlId}`, 502, envelope);
    }
    const result = parsePossibleJson(envelope.result);
    return Array.isArray(result) ? result : [];
  }

  executeCtlSqlO(sqlId, options) {
    return this.executeCtlSql(sqlId, options, false, true);
  }
}

module.exports = { HisClient, HisError, parseLoginResponse };
