const { AppError } = require('../../shared/app-error');
const { parseReportDate } = require('../../shared/date');

const definition = {
  id: 'benh-nhan-tiep-don-ngay',
  name: 'Danh sách bệnh nhân tiếp đón theo ngày',
  summary: 'Danh sách bệnh nhân ngoại trú tiếp nhận trong đúng một ngày.',
  type: 'Báo cáo HIS',
  status: 'Đang hoạt động',
  version: 'v1',
  protocol: 'REST',
  auth: 'API Key',
  trigger: { type: 'http', method: 'POST', path: '/api/v1/reports/benh-nhan-tiep-don-ngay' },
  execution: { type: 'his-ctl-sql', ctlSql: 'NGT002_DSBN_TN_VPC', namedColumns: true },
  delivery: { type: 'http-response' },
  fields: [
    { name: 'ngaytiepnhan', type: 'string', required: true, description: 'DD/MM/YYYY' }
  ],
  sampleBody: { ngaytiepnhan: '21/09/2026' }
};

async function execute({ body, hisClient }) {
  if (!parseReportDate(body.ngaytiepnhan)) {
    throw new AppError('INVALID_RECEPTION_DATE', 'ngaytiepnhan phải là ngày hợp lệ theo định dạng DD/MM/YYYY', 400);
  }
  const data = await hisClient.executeCtlSqlO(definition.execution.ctlSql, [
    { name: '[0]', value: body.ngaytiepnhan }
  ]);
  return { data, meta: { count: data.length, ngaytiepnhan: body.ngaytiepnhan } };
}

module.exports = { definition, execute };
