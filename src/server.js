const http = require('node:http');
const { loadConfig } = require('./config/index');
const { HisClient } = require('./clients/his-rest-client');
const { createApp } = require('./app');

const config = loadConfig();
const hisClient = new HisClient(config);
const server = http.createServer(createApp({ config, hisClient }));

async function bootstrap() {
  if (config.hisUsername && config.hisPassword) {
    try {
      const session = await hisClient.login(config.hisUsername, config.hisPassword);
      hisClient.rememberCredentials(config.hisUsername, config.hisPassword);
      console.log(`[HIS] Đăng nhập thành công: ${session.user?.USERNAME || config.hisUsername}`);
    } catch (error) {
      console.error(`[HIS] Chưa đăng nhập được: ${error.message}`);
    }
  } else {
    console.warn('[HIS] Chưa cấu hình HIS_USERNAME/HIS_PASSWORD; endpoint PTO_01 sẽ trả 503.');
  }

  server.listen(config.port, config.host, () => {
    console.log(`HIS L2 API Portal: http://${config.host}:${config.port}`);
  });
}

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') console.error(`[PORT] Cổng ${config.port} đang được sử dụng.`);
  else console.error(error);
  process.exitCode = 1;
});

bootstrap();
