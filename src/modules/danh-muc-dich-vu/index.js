const { AppError } = require('../../shared/app-error');

const definition = {
  id: 'danh-muc-dich-vu',
  name: 'Danh mục dịch vụ',
  summary: 'Danh mục dịch vụ HIS dùng để đồng bộ sang hệ thống đối tác.',
  type: 'Danh mục HIS',
  status: 'Đang hoạt động',
  version: 'v1',
  protocol: 'REST',
  auth: 'API Key',
  trigger: { type: 'http', method: 'POST', path: '/api/v1/catalogs/dich-vu' },
  execution: { type: 'his-ctl-sql', ctlSql: 'API_DIM_DICH_VU_VPC', namedColumns: true },
  delivery: { type: 'http-response' },
  fields: [],
  sampleBody: {}
};

function mapService(row, index) {
  const service = {
    MaDV: String(row.MADV ?? row.MADICHVU ?? '').trim(),
    TenDV: String(row.TENDV ?? row.TENDICHVU ?? '').trim(),
    NhomDV: String(row.NHOMDV ?? row.NHOM ?? '').trim()
  };

  if (!service.MaDV || !service.TenDV || !service.NhomDV) {
    throw new AppError(
      'INVALID_SERVICE_DATA',
      `Dữ liệu danh mục dịch vụ không hợp lệ tại dòng ${index + 1}`,
      502
    );
  }
  return service;
}

async function execute({ hisClient }) {
  const rows = await hisClient.executeCtlSqlO(definition.execution.ctlSql, []);
  const data = rows.map(mapService);
  return {
    data,
    meta: { count: data.length }
  };
}

module.exports = { definition, execute, mapService };
