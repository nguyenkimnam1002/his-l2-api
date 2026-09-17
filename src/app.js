const fs = require('node:fs');
const path = require('node:path');
const { operations, getOperation, findHttpOperation, toPublicApi } = require('./registry/operations');
const { HisError } = require('./his-client');
const { AppError } = require('./shared/app-error');
const { parseReportDate } = require('./shared/date');

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) throw Object.assign(new Error('Payload quá lớn'), { statusCode: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('JSON không hợp lệ'), { statusCode: 400 }); }
}

function hasApiKey(req, apiKeys) {
  const provided = req.headers['x-api-key'];
  return typeof provided === 'string' && apiKeys.includes(provided);
}

function isLocalAdmin(req) {
  const remote = req.socket.remoteAddress || '';
  const host = String(req.headers.host || '').split(':')[0].toLowerCase();
  const origin = req.headers.origin;
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)
    && ['localhost', '127.0.0.1'].includes(host)
    && (!origin || origin === `http://${req.headers.host}`);
}

function rejectUnavailableApi(res, definition) {
  if (definition.status === 'Đang hoạt động') return false;
  const cancelled = definition.status === 'Đã hủy';
  json(res, cancelled ? 410 : 503, {
    error: {
      code: cancelled ? 'API_CANCELLED' : 'API_PAUSED',
      message: cancelled ? 'API đã hủy' : 'API đang tạm dừng'
    }
  });
  return true;
}

function createApp({ config, hisClient }) {
  return async function handler(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    try {
      if (req.method === 'GET' && url.pathname === '/api/health') {
        const body = { ok: true, timestamp: new Date().toISOString() };
        if (config.localAdminEnabled !== false) body.hisSession = Boolean(hisClient.session?.uuid);
        return json(res, 200, body);
      }
      if (req.method === 'GET' && url.pathname === '/api/catalog') {
        return json(res, 200, {
          data: operations
            .filter(({ definition }) => definition.trigger?.type === 'http')
            .map(toPublicApi)
        });
      }

      if (req.method === 'GET' && url.pathname === '/api/admin/api-key') {
        if (config.localAdminEnabled === false) return json(res, 404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy endpoint' } });
        if (!isLocalAdmin(req)) return json(res, 403, { error: { code: 'LOCAL_ONLY', message: 'Chỉ dùng trong giao diện quản trị local' } });
        return json(res, 200, { apiKey: config.apiKeys[0] || '' });
      }

      if (req.method === 'POST' && url.pathname === '/api/admin/his-session') {
        if (config.localAdminEnabled === false) return json(res, 404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy endpoint' } });
        if (!isLocalAdmin(req)) return json(res, 403, { error: { code: 'LOCAL_ONLY', message: 'Chỉ quản trị HIS từ máy local' } });
        const body = await readJson(req);
        const username = String(body.username ?? '').trim();
        const password = String(body.password ?? '');
        hisClient.logout();
        if (!username || !password) return json(res, 400, { error: { code: 'INVALID_INPUT', message: 'Cần nhập tài khoản và mật khẩu HIS' } });
        const session = await hisClient.login(username, password);
        // Chỉ báo kết nối thành công sau khi UUID + cookie chạy được một lệnh đọc HIS.
        const probe = getOperation('pto-01').definition;
        await hisClient.executeCtlSql(probe.execution.ctlSql, [{ name: '[0]', value: '0' }]);
        hisClient.rememberCredentials(username, password);
        return json(res, 200, { data: { userName: session.user?.USER_NAME || session.user?.USERNAME || username, fullName: session.user?.FULL_NAME || '', hospitalId: session.user?.HOSPITAL_ID || '' } });
      }

      if (req.method === 'DELETE' && url.pathname === '/api/admin/his-session') {
        if (config.localAdminEnabled === false) return json(res, 404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy endpoint' } });
        if (!isLocalAdmin(req)) return json(res, 403, { error: { code: 'LOCAL_ONLY', message: 'Chỉ quản trị HIS từ máy local' } });
        hisClient.logout();
        return json(res, 200, { success: true });
      }

      const operation = findHttpOperation(req.method, url.pathname);
      if (operation) {
        if (!hasApiKey(req, config.apiKeys)) return json(res, 401, { error: { code: 'INVALID_API_KEY', message: 'Thiếu hoặc sai header X-API-Key' } });
        if (rejectUnavailableApi(res, operation.definition)) return;
        const body = await readJson(req);
        const result = await operation.execute({ body, hisClient, config });
        return json(res, 200, result);
      }

      if (req.method === 'GET' && (url.pathname === '/' || !path.extname(url.pathname))) {
        const index = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'));
        res.writeHead(200, { 'content-type': MIME['.html'] });
        return res.end(index);
      }
      if (req.method === 'GET') {
        const safePath = path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
        const filePath = path.join(PUBLIC_DIR, safePath);
        if (filePath.startsWith(PUBLIC_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          res.writeHead(200, { 'content-type': MIME[path.extname(filePath)] || 'application/octet-stream' });
          return fs.createReadStream(filePath).pipe(res);
        }
      }
      return json(res, 404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy endpoint' } });
    } catch (error) {
      console.error(`[${req.method}] ${url.pathname}:`, error.message, error.cause?.message || '');
      const status = error.statusCode || (error instanceof HisError ? error.statusCode : 500);
      if (error instanceof HisError && url.pathname.startsWith('/api/v1/')) {
        return json(res, status, { error: { code: 'HIS_UPSTREAM_ERROR', message: status === 503 ? 'HIS chưa kết nối hoặc phiên đã hết hạn' : 'Không lấy được dữ liệu HIS' } });
      }
      if (error instanceof AppError) {
        return json(res, status, { error: { code: error.code, message: error.message, details: error.details } });
      }
      return json(res, status, { error: { code: 'INTERNAL_ERROR', message: error.message, details: error.details } });
    }
  };
}

module.exports = { createApp, readJson, hasApiKey, isLocalAdmin, parseReportDate, rejectUnavailableApi };
