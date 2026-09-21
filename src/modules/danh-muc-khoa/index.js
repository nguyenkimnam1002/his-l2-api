const { AppError } = require('../../shared/app-error');

const definition = {
  id: 'danh-muc-khoa',
  name: 'Danh mục khoa',
  summary: 'Danh mục khoa và số giường kế hoạch, thực kê theo khoa.',
  type: 'Danh mục HIS',
  status: 'Đang hoạt động',
  version: 'v1',
  protocol: 'REST',
  auth: 'API Key',
  trigger: { type: 'http', method: 'POST', path: '/api/v1/catalogs/khoa' },
  execution: { type: 'his-ctl-sql', ctlSql: 'API_DIM_KHOA', namedColumns: true },
  delivery: { type: 'http-response' },
  fields: [],
  sampleBody: {}
};

function mapDepartment(row, index) {
  const department = {
    KhoaId: String(row.KHOAID ?? '').trim(),
    MaKhoa: String(row.MAKHOA ?? '').trim(),
    TenKhoa: String(row.TENKHOA ?? '').trim(),
    GiuongKeHoach: Number(row.GIUONGKEHOACH ?? 0),
    GiuongThucKe: Number(row.GIUONGTHUCKE ?? 0)
  };

  if (!department.KhoaId || !department.MaKhoa || !department.TenKhoa
    || !Number.isFinite(department.GiuongKeHoach)
    || !Number.isFinite(department.GiuongThucKe)) {
    throw new AppError(
      'INVALID_DEPARTMENT_DATA',
      `Dữ liệu danh mục khoa không hợp lệ tại dòng ${index + 1}`,
      502
    );
  }
  return department;
}

async function execute({ hisClient }) {
  const rows = await hisClient.executeCtlSqlO(definition.execution.ctlSql, []);
  const data = rows.map(mapDepartment);
  return { data, meta: { count: data.length } };
}

module.exports = { definition, execute, mapDepartment };
