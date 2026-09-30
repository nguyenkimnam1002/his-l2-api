const { AppError } = require('../../shared/app-error');
const { parseReportDate } = require('../../shared/date');

const commonFields = [
  { name: 'tuNgay', label: 'Từ ngày', type: 'date', required: true, placeholder: 'DD/MM/YYYY' },
  { name: 'denNgay', label: 'Đến ngày', type: 'date', required: true, placeholder: 'DD/MM/YYYY' },
  { name: 'khoaId', label: 'Khoa', type: 'department', required: false, defaultValue: '-1' }
];

const reportConfigs = [
  { id: 'ksk-can-bo', name: 'Báo cáo khám sức khỏe cán bộ', summary: 'Dữ liệu import khám sức khỏe cán bộ.', ctlSql: 'KSK_CB_IMP_VPC' },
  { id: 'ksk-dinh-ky', name: 'Báo cáo khám sức khỏe định kỳ', summary: 'Dữ liệu import khám sức khỏe định kỳ.', ctlSql: 'KSK_DK_IMP_VPC' },
  { id: 'ksk-duoi-18', name: 'Báo cáo khám sức khỏe dưới 18 tuổi', summary: 'Dữ liệu import khám sức khỏe dưới 18 tuổi.', ctlSql: 'KSK_D18_IMP_VPC' },
  { id: 'ksk-tren-18', name: 'Báo cáo khám sức khỏe trên 18 tuổi', summary: 'Dữ liệu import khám sức khỏe trên 18 tuổi.', ctlSql: 'KSK_T18_IMP_VPC1' }
];

function toDate(value) {
  return parseReportDate(value);
}

function addCalendarMonths(date, months) {
  const year = date.getUTCFullYear(); const month = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)));
}

function expandDynamicFields(rows) {
  const sample = rows[0] || {};
  const titleKey = Object.keys(sample).find((name) => name.toUpperCase() === 'MA_TIEUDE');
  const valueKey = Object.keys(sample).find((name) => name.toUpperCase() === 'NOIDUNG');
  const recordKey = Object.keys(sample).find((name) => name.toUpperCase() === 'HOSOBENHANID');
  if (titleKey && valueKey && recordKey) {
    const grouped = new Map();
    for (const row of rows) {
      const id = String(row[recordKey] ?? '');
      if (!grouped.has(id)) {
        const base = { ...row }; delete base[titleKey]; delete base[valueKey];
        grouped.set(id, base);
      }
      const title = String(row[titleKey] ?? '').trim();
      if (title) {
        const current = grouped.get(id)[title]; const next = row[valueKey];
        if (current == null || String(next ?? '') > String(current ?? '')) grouped.get(id)[title] = next;
      }
    }
    return [...grouped.values()];
  }
  return rows.map((row) => {
    const key = Object.keys(row).find((name) => name.toUpperCase() === 'DU_LIEU_JSON');
    if (!key || row[key] == null || row[key] === '') return row;
    try {
      const fields = typeof row[key] === 'string' ? JSON.parse(row[key]) : row[key];
      if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return row;
      const expanded = { ...row }; delete expanded[key];
      return { ...expanded, ...fields };
    } catch {
      return row;
    }
  });
}

function createOperation(config) {
  const definition = {
    id: `report-${config.id}`,
    name: config.name,
    summary: config.summary,
    type: 'Báo cáo động',
    status: 'Đang hoạt động',
    version: 'v1',
    protocol: 'REST',
    auth: 'API Key',
    trigger: { type: 'http', method: 'POST', path: `/api/v1/dynamic-reports/${config.id}` },
    execution: { type: 'his-ctl-sql', ctlSql: config.ctlSql, namedColumns: true },
    delivery: { type: 'http-response' },
    fields: commonFields,
    sampleBody: { tuNgay: '01/09/2026', denNgay: '29/09/2026', khoaId: '-1' }
  };
  return {
    definition,
    async execute({ body, hisClient }) {
      const from = toDate(body.tuNgay); const to = toDate(body.denNgay);
      if (!from || !to) throw new AppError('INVALID_REPORT_DATE', 'tuNgay và denNgay phải đúng định dạng DD/MM/YYYY', 400);
      const days = Math.floor((to - from) / 86_400_000);
      if (days < 0) throw new AppError('INVALID_REPORT_RANGE', 'tuNgay không được lớn hơn denNgay', 400);
      if (to > addCalendarMonths(from, 6)) throw new AppError('REPORT_RANGE_TOO_LARGE', 'Khoảng báo cáo tối đa 6 tháng', 400);
      const khoaId = String(body.khoaId ?? '-1').trim() || '-1';
      if (khoaId !== '-1' && !/^\d+$/.test(khoaId)) throw new AppError('INVALID_DEPARTMENT_ID', 'khoaId phải là ID dạng số', 400);
      const rows = await hisClient.executeCtlSqlO(config.ctlSql, [
        { name: '[0]', value: `${body.tuNgay} 00:00:00` },
        { name: '[1]', value: `${body.denNgay} 00:00:00` },
        { name: '[2]', value: khoaId }
      ]);
      const data = expandDynamicFields(rows);
      return { data, meta: { count: data.length, reportId: config.id, tuNgay: body.tuNgay, denNgay: body.denNgay, khoaId } };
    }
  };
}

const operations = reportConfigs.map(createOperation);
module.exports = { operations, reportConfigs, createOperation, expandDynamicFields };
