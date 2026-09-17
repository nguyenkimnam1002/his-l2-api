const { AppError } = require('../../shared/app-error');

const definition = {
  id: 'pto-01',
  name: 'Tra cứu hồ sơ bệnh án',
  summary: 'Trả về thông tin hành chính và chẩn đoán ra viện của một hồ sơ bệnh án.',
  type: 'Dữ liệu HIS',
  status: 'Đang hoạt động',
  version: 'v1',
  protocol: 'REST',
  auth: 'API Key',
  trigger: { type: 'http', method: 'POST', path: '/api/v1/medical-records/pto-01' },
  execution: { type: 'his-ctl-sql', ctlSql: 'PTO_01', namedColumns: false },
  delivery: { type: 'http-response' },
  fields: [
    { name: 'hosobenhanid', type: 'string', required: true, description: 'ID hồ sơ bệnh án.' }
  ],
  sampleBody: { hosobenhanid: '0' }
};

async function execute({ body, hisClient }) {
  const id = String(body.hosobenhanid ?? '').trim();
  if (!/^\d+$/.test(id)) {
    throw new AppError('INVALID_INPUT', 'hosobenhanid phải là chuỗi số', 400);
  }
  const data = await hisClient.executeCtlSql(
    definition.execution.ctlSql,
    [{ name: '[0]', value: id }]
  );
  return { data, meta: { count: data.length } };
}

module.exports = { definition, execute };
