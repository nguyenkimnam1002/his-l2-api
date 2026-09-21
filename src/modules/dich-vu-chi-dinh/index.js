const { AppError } = require('../../shared/app-error');

const definition = {
  id: 'dich-vu-chi-dinh',
  name: 'Danh sách dịch vụ chỉ định',
  summary: 'Dịch vụ CLS, thuốc và vật tư được chỉ định theo lần khám.',
  type: 'Dữ liệu HIS',
  status: 'Đang hoạt động',
  version: 'v1',
  protocol: 'REST',
  auth: 'API Key',
  trigger: { type: 'http', method: 'POST', path: '/api/v1/clinical-services/chi-dinh' },
  execution: { type: 'his-ctl-sql-multiple', ctlSql: ['CLS_CHIDINH_VPC', 'THUOCVT_CD_VPC'], namedColumns: true },
  delivery: { type: 'http-response' },
  fields: [
    { name: 'khambenhid', type: 'string', required: true, description: 'ID lần khám/điều trị' }
  ],
  sampleBody: { khambenhid: '1334499' }
};

function requiredId(value) {
  const id = String(value ?? '').trim();
  return /^\d+$/.test(id) ? id : null;
}

async function execute({ body, hisClient }) {
  const khambenhid = requiredId(body.khambenhid);
  if (!khambenhid) {
    throw new AppError('INVALID_CLINICAL_SERVICE_INPUT', 'khambenhid phải là ID dạng số', 400);
  }
  const options = [{ name: '[0]', value: khambenhid }];
  const [cls, thuocVatTu] = await Promise.all([
    hisClient.executeCtlSqlO('CLS_CHIDINH_VPC', options),
    hisClient.executeCtlSqlO('THUOCVT_CD_VPC', options)
  ]);
  return {
    data: { cls, thuocVatTu },
    meta: { khambenhid, clsCount: cls.length, thuocVatTuCount: thuocVatTu.length }
  };
}

module.exports = { definition, execute, requiredId };
