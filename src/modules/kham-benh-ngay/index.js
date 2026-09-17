const { AppError } = require('../../shared/app-error');
const { parseReportDate } = require('../../shared/date');

const definition = {
  id: 'kham-benh-ngay',
  name: 'Danh sách khám bệnh theo ngày',
  summary: 'Báo cáo khám bệnh ngoại trú theo khoảng ngày.',
  type: 'Báo cáo HIS',
  status: 'Đang hoạt động',
  version: 'v1',
  protocol: 'REST',
  auth: 'API Key',
  trigger: { type: 'http', method: 'POST', path: '/api/v1/reports/kham-benh-ngay' },
  execution: { type: 'his-ctl-sql', ctlSql: 'API_DS_KBH_NGAY', namedColumns: true },
  delivery: { type: 'http-response' },
  fields: [
    { name: 'tuNgay', type: 'string', required: true, description: 'DD/MM/YYYY' },
    { name: 'denNgay', type: 'string', required: true, description: 'DD/MM/YYYY' }
  ],
  sampleBody: { tuNgay: '15/09/2026', denNgay: '15/09/2026' }
};

async function execute({ body, hisClient }) {
  const from = parseReportDate(body.tuNgay);
  const to = parseReportDate(body.denNgay);
  if (!from || !to || from > to) {
    throw new AppError(
      'INVALID_DATE_RANGE',
      'tuNgay và denNgay phải là ngày hợp lệ DD/MM/YYYY, tuNgay không sau denNgay',
      400
    );
  }
  const data = await hisClient.executeCtlSqlO(definition.execution.ctlSql, [
    { name: '[0]', value: body.tuNgay },
    { name: '[1]', value: body.denNgay }
  ]);
  return {
    data,
    meta: { count: data.length, tuNgay: body.tuNgay, denNgay: body.denNgay }
  };
}

module.exports = { definition, execute };
