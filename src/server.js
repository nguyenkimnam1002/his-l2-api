const http = require('node:http');
const { loadConfig } = require('./config/index');
const { HisClient } = require('./clients/his-rest-client');
const { ConnectionManager } = require('./connections/connection-manager');
const { ConnectionRateLimiter } = require('./security/connection-rate-limiter');
const { createApp } = require('./app');

const config = loadConfig();
const connectionManager = new ConnectionManager({
  ttlMs: config.connectionTtlMs,
  idleMs: config.connectionIdleMs,
  allowedDomainSuffixes: config.allowedDomainSuffixes,
  hisClientFactory: (hospitalUrl) => new HisClient({ hospitalUrl, requestTimeoutMs: config.requestTimeoutMs, rejectUnauthorized: config.rejectUnauthorized })
});
const connectionRateLimiter = new ConnectionRateLimiter({ maxAttempts: config.connectionMaxAttempts, windowMs: config.connectionRateWindowMs, blockMs: config.connectionBlockMs });
const server = http.createServer(createApp({ config, connectionManager, connectionRateLimiter }));

server.listen(config.port, config.host, () => console.log(`HIS L2 API Portal: http://${config.host}:${config.port}`));
server.on('error', (error) => { if (error.code === 'EADDRINUSE') console.error(`[PORT] Cổng ${config.port} đang được sử dụng.`); else console.error(error); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { connectionManager.close(); server.close(() => process.exit(0)); });
