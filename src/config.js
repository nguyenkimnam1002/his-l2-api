const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function loadConfig() {
  const environment = process.env.NODE_ENV || 'development';
  let fileConfig = {};
  const configPath = path.join(ROOT, 'config.json');
  if (fs.existsSync(configPath)) {
    fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  const apiKeys = process.env.API_KEYS
    ? process.env.API_KEYS.split(',').map((value) => value.trim()).filter(Boolean)
    : fileConfig.apiKeys || (environment === 'production' ? [] : ['local-dev-key-change-me']);

  if (environment === 'production' && (!apiKeys.length || apiKeys.includes('local-dev-key-change-me'))) {
    throw new Error('Production bắt buộc cấu hình API_KEYS an toàn');
  }

  return {
    port: Number(process.env.PORT || fileConfig.port || 8090),
    host: process.env.HOST || fileConfig.host || '127.0.0.1',
    environment,
    localAdminEnabled: environment !== 'production',
    hospitalUrl: process.env.HIS_REST_SERVICE_URL
      || fileConfig.hospitalUrl
      || 'https://bvvinhphuc.vncare.vn/vnpthis/RestService',
    apiKeys,
    requestTimeoutMs: Number(process.env.HIS_REQUEST_TIMEOUT_MS || fileConfig.requestTimeoutMs || 30000),
    rejectUnauthorized: process.env.HIS_TLS_VERIFY
      ? process.env.HIS_TLS_VERIFY !== 'false'
      : fileConfig.rejectUnauthorized ?? environment === 'production',
    hisUsername: process.env.HIS_USERNAME || '',
    hisPassword: process.env.HIS_PASSWORD || ''
  };
}

module.exports = { loadConfig };
