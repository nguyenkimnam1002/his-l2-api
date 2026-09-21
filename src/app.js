const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { operations, findHttpOperation, toPublicApi } = require('./registry/operations');
const { HisError } = require('./clients/his-rest-client');
const { AppError } = require('./shared/app-error');
const { parseReportDate } = require('./shared/date');

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const CONNECTION_API = {
  id: 'his-connection',
  name: 'Tạo kết nối HIS',
  summary: 'Đăng nhập HIS và cấp connectionId tạm thời để gọi các API dữ liệu.',
  method: 'POST',
  path: '/api/v1/connections',
  type: 'Kết nối HIS',
  status: 'Đang hoạt động',
  version: 'v1',
  protocol: 'REST',
  auth: 'API Key',
  fields: [
    { name: 'domain', type: 'string', required: true, description: 'Domain bệnh viện, không gồm https://' },
    { name: 'username', type: 'string', required: true, description: 'Tài khoản HIS' },
    { name: 'password', type: 'string', required: true, description: 'Mật khẩu HIS' }
  ],
  sampleBody: { domain: 'benhvienphucyen.vncare.vn', username: '<TAI_KHOAN_HIS>', password: '<MAT_KHAU_HIS>' }
};
const SECURITY_HEADERS = { 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer', 'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" };
function json(res, status, body) { res.writeHead(status, { ...SECURITY_HEADERS, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); }
async function readJson(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 1024 * 1024) throw new AppError('PAYLOAD_TOO_LARGE', 'Payload quá lớn', 413); chunks.push(chunk); }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new AppError('INVALID_JSON', 'JSON không hợp lệ', 400); }
}
function getApiKey(req, apiKeys) {
  const provided = req.headers['x-api-key']; if (typeof provided !== 'string') return null;
  return apiKeys.find((key) => key.length === provided.length && crypto.timingSafeEqual(Buffer.from(key), Buffer.from(provided))) || null;
}
function hasApiKey(req, apiKeys) { return Boolean(getApiKey(req, apiKeys)); }
function isLocalAdmin(req) {
  const remote = req.socket.remoteAddress || ''; const host = String(req.headers.host || '').split(':')[0].toLowerCase(); const origin = req.headers.origin;
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote) && ['localhost', '127.0.0.1'].includes(host) && (!origin || origin === `http://${req.headers.host}`);
}
function requireApiKey(req, config) { const key = getApiKey(req, config.apiKeys || []); if (!key) throw new AppError('INVALID_API_KEY', 'Thiếu hoặc sai header X-API-Key', 401); return key; }
function safeConnection(record) { return { domain: record.domain, hospitalId: record.hospitalId, userName: record.userName, fullName: record.fullName, expiresAt: new Date(record.expiresAt).toISOString() }; }
function rejectUnavailableApi(res, definition) {
  if (definition.status === 'Đang hoạt động') return false;
  const cancelled = definition.status === 'Đã hủy'; json(res, cancelled ? 410 : 503, { error: { code: cancelled ? 'API_CANCELLED' : 'API_PAUSED', message: cancelled ? 'API đã hủy' : 'API đang tạm dừng' } }); return true;
}

function createApp({ config, connectionManager, connectionRateLimiter, hisClient }) {
  // The hisClient adapter is retained only for isolated legacy unit tests.
  const legacyTestAdapter = !connectionManager && Boolean(hisClient);
  if (!connectionManager && hisClient) connectionManager = {
    count: () => Number(Boolean(hisClient.session?.uuid)),
    get: () => ({ hisClient, hospitalId: 'TEST', domain: 'test.vncare.vn', userName: 'test', fullName: '', expiresAt: Date.now() + 60_000 })
  };
  if (!connectionManager) throw new Error('createApp requires connectionManager');
  return async function handler(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    try {
      if (req.method === 'GET' && url.pathname === '/api/health') { const body = { ok: true, timestamp: new Date().toISOString() }; if (config.localAdminEnabled !== false) body.activeConnections = connectionManager.count(); return json(res, 200, body); }
      if (req.method === 'GET' && url.pathname === '/api/catalog') return json(res, 200, { data: [CONNECTION_API, ...operations.filter(({ definition }) => definition.trigger?.type === 'http').map(toPublicApi)] });
      if (req.method === 'GET' && url.pathname === '/api/admin/api-key') {
        if (config.localAdminEnabled === false) return json(res, 404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy endpoint' } });
        if (!isLocalAdmin(req)) return json(res, 403, { error: { code: 'LOCAL_ONLY', message: 'Chỉ dùng trong giao diện quản trị local' } });
        return json(res, 200, { apiKey: config.apiKeys[0] || '' });
      }
      if (legacyTestAdapter && req.method === 'POST' && url.pathname === '/api/admin/his-session') {
        if (config.localAdminEnabled === false) return json(res, 404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy endpoint' } });
        const body = await readJson(req); const session = await hisClient.login(String(body.username || '').trim(), String(body.password || '')); hisClient.rememberCredentials?.(body.username, body.password);
        return json(res, 200, { data: { userName: session.user?.USERNAME || body.username } });
      }
      if (url.pathname === '/api/v1/connections' && req.method === 'POST') {
        const apiKey = requireApiKey(req, config); const body = await readJson(req); const ip = req.socket.remoteAddress || '';
        connectionRateLimiter?.assertAllowed(apiKey, ip, body.username);
        try { const data = await connectionManager.create({ domain: body.domain, username: body.username, password: body.password, apiKey }); connectionRateLimiter?.recordSuccess(apiKey, ip, body.username); return json(res, 201, { data }); }
        catch (error) { connectionRateLimiter?.recordFailure(apiKey, ip, body.username); throw error; }
      }
      if (url.pathname === '/api/v1/connections/current' && (req.method === 'GET' || req.method === 'DELETE')) {
        const apiKey = requireApiKey(req, config); const connectionId = req.headers['x-his-connection-id'];
        if (req.method === 'DELETE') { connectionManager.revoke(connectionId, apiKey); return json(res, 200, { success: true }); }
        return json(res, 200, { data: safeConnection(connectionManager.get(connectionId, apiKey)) });
      }
      const operation = findHttpOperation(req.method, url.pathname);
      if (operation) {
        const apiKey = requireApiKey(req, config); if (rejectUnavailableApi(res, operation.definition)) return;
        const connection = connectionManager.get(req.headers['x-his-connection-id'], apiKey); const body = await readJson(req);
        const result = await operation.execute({ body, hisClient: connection.hisClient, config });
        if (!legacyTestAdapter) result.meta = { ...(result.meta || {}), hospitalId: connection.hospitalId };
        return json(res, 200, result);
      }
      const operationAtPath = operations.find(({ definition }) => definition.trigger?.type === 'http' && definition.trigger.path === url.pathname);
      if (operationAtPath) return json(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: `Endpoint này chỉ hỗ trợ ${operationAtPath.definition.trigger.method}` } });
      if (url.pathname.startsWith('/api/')) return json(res, 404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy endpoint' } });
      if (req.method === 'GET' && (url.pathname === '/' || !path.extname(url.pathname))) { const index = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html')); res.writeHead(200, { ...SECURITY_HEADERS, 'content-type': MIME['.html'], 'cache-control': 'no-store' }); return res.end(index); }
      if (req.method === 'GET') {
        const safePath = path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, ''); const filePath = path.join(PUBLIC_DIR, safePath);
        if (filePath.startsWith(PUBLIC_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) { res.writeHead(200, { ...SECURITY_HEADERS, 'content-type': MIME[path.extname(filePath)] || 'application/octet-stream' }); return fs.createReadStream(filePath).pipe(res); }
      }
      return json(res, 404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy endpoint' } });
    } catch (error) {
      console.error(`[${req.method}] ${url.pathname}:`, error.code || error.name, error.message); const status = error.statusCode || 500;
      if (error instanceof HisError && url.pathname.startsWith('/api/v1/')) return json(res, status, { error: { code: 'HIS_UPSTREAM_ERROR', message: status === 503 ? 'Phiên HIS đã hết hạn hoặc không thể kết nối lại' : 'Không lấy được dữ liệu HIS' } });
      if (error instanceof AppError) return json(res, status, { error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } });
      return json(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Đã có lỗi xảy ra khi xử lý dữ liệu' } });
    }
  };
}
module.exports = { createApp, readJson, hasApiKey, isLocalAdmin, parseReportDate, rejectUnavailableApi };
