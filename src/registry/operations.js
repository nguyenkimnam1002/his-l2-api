const pto01 = require('../modules/pto-01');
const khamBenhNgay = require('../modules/kham-benh-ngay');
const danhMucDichVu = require('../modules/danh-muc-dich-vu');
const danhMucKhoa = require('../modules/danh-muc-khoa');
const danhMucPhong = require('../modules/danh-muc-phong');
const benhNhanTiepDonNgay = require('../modules/benh-nhan-tiep-don-ngay');
const dichVuChiDinh = require('../modules/dich-vu-chi-dinh');

const operations = [pto01, khamBenhNgay, benhNhanTiepDonNgay, dichVuChiDinh, danhMucDichVu, danhMucKhoa, danhMucPhong];

function validateRegistry(items) {
  const ids = new Set();
  const httpRoutes = new Set();
  for (const operation of items) {
    const { definition } = operation;
    if (!definition?.id || typeof operation.execute !== 'function') {
      throw new Error('Operation phải có definition.id và hàm execute');
    }
    if (ids.has(definition.id)) throw new Error(`Trùng operation id: ${definition.id}`);
    ids.add(definition.id);
    if (definition.trigger?.type === 'http') {
      const route = `${definition.trigger.method} ${definition.trigger.path}`;
      if (httpRoutes.has(route)) throw new Error(`Trùng HTTP route: ${route}`);
      httpRoutes.add(route);
    }
  }
}

validateRegistry(operations);

function getOperation(id) {
  const operation = operations.find((item) => item.definition.id === id);
  if (!operation) throw new Error(`Không tìm thấy operation: ${id}`);
  return operation;
}

function findHttpOperation(method, pathname) {
  return operations.find(({ definition }) => definition.trigger?.type === 'http'
    && definition.trigger.method === method
    && definition.trigger.path === pathname);
}

function toPublicApi({ definition }) {
  const { trigger } = definition;
  return {
    id: definition.id,
    name: definition.name,
    summary: definition.summary,
    method: trigger?.type === 'http' ? trigger.method : null,
    path: trigger?.type === 'http' ? trigger.path : null,
    type: definition.type,
    status: definition.status,
    version: definition.version,
    protocol: definition.protocol,
    auth: definition.auth,
    fields: definition.fields || [],
    sampleBody: definition.sampleBody || {}
  };
}

module.exports = { operations, getOperation, findHttpOperation, toPublicApi, validateRegistry };
