const dns = require('node:dns');
const net = require('node:net');
const { AppError } = require('../shared/app-error');

function normalizeHospitalDomain(input) {
  const domain = String(input ?? '').trim().toLowerCase().replace(/\.$/, '');
  if (!domain || domain.length > 253 || domain.includes('://') || /[\/:?#@]/.test(domain)) {
    throw new AppError('INVALID_HOSPITAL_DOMAIN', 'Domain bệnh viện không hợp lệ', 400);
  }
  if (net.isIP(domain) || domain === 'localhost' || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) {
    throw new AppError('INVALID_HOSPITAL_DOMAIN', 'Domain bệnh viện không hợp lệ', 400);
  }
  return domain;
}

function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && (b === 0 || b === 168))
      || (a === 198 && (b === 18 || b === 19));
  }
  if (net.isIPv6(address)) {
    const value = address.toLowerCase();
    return value === '::' || value === '::1' || value.startsWith('fc') || value.startsWith('fd')
      || /^fe[89ab]/.test(value) || value.startsWith('2001:db8:')
      || (value.startsWith('::ffff:') && isPrivateAddress(value.slice(7)));
  }
  return true;
}

async function assertPublicHospitalDomain(input, options = {}) {
  const domain = normalizeHospitalDomain(input);
  const suffixes = options.allowedSuffixes || ['.vncare.vn'];
  if (!suffixes.some((suffix) => domain.endsWith(String(suffix).toLowerCase()))) {
    throw new AppError('HOSPITAL_DOMAIN_NOT_ALLOWED', 'Domain không thuộc hệ thống HIS được phép', 403);
  }
  const lookup = options.lookup || dns.promises.lookup;
  let addresses;
  try { addresses = await lookup(domain, { all: true, verbatim: true }); }
  catch { throw new AppError('HOSPITAL_DOMAIN_UNRESOLVED', 'Không phân giải được domain bệnh viện', 400); }
  if (!addresses?.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new AppError('HOSPITAL_DOMAIN_UNSAFE', 'Domain bệnh viện không trỏ tới địa chỉ Internet hợp lệ', 403);
  }
  return domain;
}

function toRestServiceUrl(domain) {
  return `https://${domain}/vnpthis/RestService`;
}

module.exports = { normalizeHospitalDomain, assertPublicHospitalDomain, isPrivateAddress, toRestServiceUrl };
