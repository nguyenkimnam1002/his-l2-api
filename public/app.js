const state = {
  apis: [], selected: null, apiKey: '', localAdmin: false,
  connectionId: sessionStorage.getItem('hisConnectionId') || '', connection: null,
  revealed: new Set(), filter: 'all', sortAscending: true
};
const list = document.querySelector('#api-list');
const detail = document.querySelector('#api-detail');
const dialog = document.querySelector('#login-dialog');
const search = document.querySelector('#search');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function renderList() {
  const statuses = { active: 'Đang hoạt động', paused: 'Tạm dừng', cancelled: 'Đã hủy' };
  const query = search.value.trim().toLowerCase();
  const apis = state.apis.filter((api) => state.filter === 'all' || api.status === statuses[state.filter])
    .filter((api) => `${api.name} ${api.path}`.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi') * (state.sortAscending ? 1 : -1));
  list.innerHTML = apis.length ? apis.map((api) => {
    const reveal = state.revealed.has(api.id); const key = state.apiKey ? (reveal ? esc(state.apiKey) : '••••••••') : 'Cấp riêng';
    const actions = state.apiKey ? `<button data-toggle="${esc(api.id)}">${reveal ? 'Ẩn' : 'Hiện'}</button><button data-copy-key>Copy</button>` : '';
    const statusClass = api.status === 'Đang hoạt động' ? 'active-status' : api.status === 'Đã hủy' ? 'cancelled-status' : 'paused-status';
    return `<tr data-id="${esc(api.id)}" class="${state.selected?.id === api.id ? 'selected' : ''}"><td><img class="row-icon" src="/icons/document_dark.svg" alt=""> <span class="api-name">${esc(api.name)}</span></td><td><span class="badge">${esc(api.type)}</span></td><td><span class="badge status-badge ${statusClass}">${esc(api.status)}</span></td><td>${esc(api.version)}</td><td><span class="badge gray">${esc(api.protocol)}</span></td><td><span class="badge green">${esc(api.auth)}</span></td><td class="key-cell"><code>${key}</code> ${actions}</td><td>${esc(location.origin)}</td></tr>`;
  }).join('') : '<tr><td colspan="8">Không tìm thấy API.</td></tr>';
}

function renderDetail(api) {
  state.selected = api; renderList(); detail.classList.remove('hidden');
  const key = state.apiKey || '<API_KEY_DUOC_CAP>'; const connectionId = state.connectionId || '<HIS_CONNECTION_ID>';
  const test = state.localAdmin ? `<h3>Run API</h3><div id="test-fields">${api.fields.map((f) => `<label>${esc(f.name)} <input data-field="${esc(f.name)}" value="${esc(api.sampleBody[f.name] ?? '')}" placeholder="${esc(f.description)}"></label>`).join('')}</div><button class="action" id="send-request">Gửi</button><pre class="response" id="response">Chưa gửi.</pre>` : '';
  detail.innerHTML = `<button class="close" id="close-detail">×</button><h2>${esc(api.name)}</h2><h3>Endpoint</h3><pre>${esc(api.method)} ${esc(location.origin + api.path)}</pre><h3>Postman</h3><pre id="snippet">${esc(api.method)} ${esc(location.origin + api.path)}\nX-API-Key: ${esc(key)}\nX-HIS-Connection-Id: ${esc(connectionId)}\nContent-Type: application/json\n\n${esc(JSON.stringify(api.sampleBody, null, 2))}</pre><div class="actions"><button class="action" id="copy">Copy mẫu</button><button class="action" id="download-postman">Tải collection</button></div>${test}`;
  document.querySelector('#close-detail').onclick = () => { state.selected = null; detail.classList.add('hidden'); renderList(); };
  document.querySelector('#copy').onclick = async (e) => { await navigator.clipboard.writeText(document.querySelector('#snippet').innerText); e.currentTarget.textContent = 'Đã copy'; };
  document.querySelector('#download-postman').onclick = () => downloadPostman(api);
  if (state.localAdmin) document.querySelector('#send-request').onclick = sendTest;
}

function downloadPostman(api) {
  const collection = { info: { name: `HIS L2 API - ${api.name}`, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' }, item: [{ name: api.name, request: { method: api.method, header: [{ key: 'X-API-Key', value: state.apiKey || '<API_KEY_DUOC_CAP>' }, { key: 'X-HIS-Connection-Id', value: state.connectionId || '<HIS_CONNECTION_ID>' }, { key: 'Content-Type', value: 'application/json' }], body: { mode: 'raw', raw: JSON.stringify(api.sampleBody, null, 2), options: { raw: { language: 'json' } } }, url: location.origin + api.path } }] };
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([JSON.stringify(collection, null, 2)], { type: 'application/json' })); link.download = `his-l2-${api.id}-postman.json`; link.click(); URL.revokeObjectURL(link.href);
}

async function sendTest() {
  const output = document.querySelector('#response'); const button = document.querySelector('#send-request'); button.disabled = true; output.textContent = 'Đang gửi...';
  try {
    if (!state.connectionId) throw new Error('Vui lòng kết nối HIS trước');
    const body = Object.fromEntries([...detail.querySelectorAll('[data-field]')].map((input) => [input.dataset.field, input.value]));
    const response = await fetch(state.selected.path, { method: state.selected.method, headers: { 'content-type': 'application/json', 'x-api-key': state.apiKey, 'x-his-connection-id': state.connectionId }, body: JSON.stringify(body) });
    output.textContent = JSON.stringify(await response.json(), null, 2);
  } catch (error) { output.textContent = error.message; } finally { button.disabled = false; }
}

list.addEventListener('click', async (event) => {
  const toggle = event.target.closest('[data-toggle]'); if (toggle) { state.revealed.has(toggle.dataset.toggle) ? state.revealed.delete(toggle.dataset.toggle) : state.revealed.add(toggle.dataset.toggle); return renderList(); }
  if (event.target.closest('[data-copy-key]')) { if (state.apiKey) await navigator.clipboard.writeText(state.apiKey); return; }
  const row = event.target.closest('[data-id]'); if (row) renderDetail(state.apis.find((api) => api.id === row.dataset.id));
});
search.addEventListener('input', renderList);
document.querySelector('#toggle-search').onclick = () => { search.hidden = !search.hidden; if (!search.hidden) search.focus(); else { search.value = ''; renderList(); } };
document.querySelector('#sort-api').onclick = () => { state.sortAscending = !state.sortAscending; renderList(); };
document.querySelector('#filter-api').onclick = () => { const values = ['all', 'active', 'paused', 'cancelled']; state.filter = values[(values.indexOf(state.filter) + 1) % values.length]; renderList(); };
document.querySelector('#connect-his').onclick = () => dialog.showModal();
document.querySelector('#close-dialog').onclick = () => dialog.close();

document.querySelector('#his-login-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); const box = document.querySelector('#login-error'); box.textContent = '';
  try {
    const response = await fetch('/api/v1/connections', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': state.apiKey }, body: JSON.stringify({ domain: values.get('domain'), username: values.get('username'), password: values.get('password') }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error?.message || 'Đăng nhập thất bại');
    state.connectionId = result.data.connectionId; state.connection = result.data; sessionStorage.setItem('hisConnectionId', state.connectionId); form.elements.password.value = ''; dialog.close(); await refreshAuthStatus(); if (state.selected) renderDetail(state.selected);
  } catch (error) { box.textContent = error.message; }
});

async function refreshAuthStatus() {
  try {
    if (!state.apiKey || !state.connectionId) throw new Error('not connected');
    const response = await fetch('/api/v1/connections/current', { headers: { 'x-api-key': state.apiKey, 'x-his-connection-id': state.connectionId } }); if (!response.ok) throw new Error('expired');
    state.connection = (await response.json()).data; document.querySelector('#gateway-status').textContent = `HIS đã kết nối: ${state.connection.hospitalId}`; document.querySelector('#logout-his').hidden = false;
  } catch { state.connectionId = ''; state.connection = null; sessionStorage.removeItem('hisConnectionId'); document.querySelector('#gateway-status').textContent = 'HIS chưa kết nối'; document.querySelector('#logout-his').hidden = true; }
}
document.querySelector('#logout-his').onclick = async () => { if (state.connectionId) await fetch('/api/v1/connections/current', { method: 'DELETE', headers: { 'x-api-key': state.apiKey, 'x-his-connection-id': state.connectionId } }); state.connectionId = ''; sessionStorage.removeItem('hisConnectionId'); await refreshAuthStatus(); };

async function bootstrap() {
  try {
    const catalogResponse = await fetch('/api/catalog'); const catalog = await catalogResponse.json(); if (!catalogResponse.ok) throw new Error(); state.apis = catalog.data;
    const keyResponse = await fetch('/api/admin/api-key'); if (keyResponse.ok) { state.apiKey = (await keyResponse.json()).apiKey || ''; state.localAdmin = true; document.querySelector('#connect-his').hidden = false; }
    renderList(); await refreshAuthStatus();
  } catch { list.innerHTML = '<tr><td colspan="8">Không tải được API.</td></tr>'; }
}
bootstrap();
