const { AppError } = require('../../shared/app-error');

const definition = {
  id: 'danh-muc-phong',
  name: 'Danh mục phòng',
  summary: 'Danh mục phòng kèm khoa quản lý.',
  type: 'Danh mục HIS',
  status: 'Đang hoạt động',
  version: 'v1',
  protocol: 'REST',
  auth: 'API Key',
  trigger: { type: 'http', method: 'POST', path: '/api/v1/catalogs/phong' },
  execution: { type: 'his-ctl-sql', ctlSql: 'API_DIM_PHONG', namedColumns: true },
  delivery: { type: 'http-response' },
  fields: [],
  sampleBody: {}
};

function mapRoom(row, index) {
  const room = {
    PhongId: String(row.PHONGID ?? row.ORG_ID ?? '').trim(),
    MaPhong: String(row.MAPHONG ?? row.ORG_CODE ?? '').trim(),
    TenPhong: String(row.TENPHONG ?? row.ORG_NAME ?? '').trim(),
    KhoaId: String(row.KHOAID ?? row.PARENT ?? '').trim(),
    MaKhoa: String(row.MAKHOA ?? '').trim(),
    TenKhoa: String(row.TENKHOA ?? row.PARENT_ID ?? '').trim()
  };

  if (!room.PhongId || !room.MaPhong || !room.TenPhong
    || !room.KhoaId || !room.MaKhoa || !room.TenKhoa) {
    throw new AppError(
      'INVALID_ROOM_DATA',
      `Dữ liệu danh mục phòng không hợp lệ tại dòng ${index + 1}`,
      502
    );
  }
  return room;
}

async function execute({ hisClient }) {
  const rows = await hisClient.executeCtlSqlO(definition.execution.ctlSql, []);
  const data = rows.map(mapRoom);
  return { data, meta: { count: data.length } };
}

module.exports = { definition, execute, mapRoom };
