const state = { apis: [], selected: null, apiKey: '', localAdmin: false, revealed: new Set(), filter: 'all', sortAscending: true };
const list = document.querySelector('#api-list');
const detail = document.querySelector('#api-detail');
const dialog = document.querySelector('#login-dialog');
const search = document.querySelector('#search');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function renderList() {
  const query = search.value.trim().toLowerCase();
  const statusFilters = { active: 'Đang hoạt động', paused: 'Tạm dừng', cancelled: 'Đã hủy' };
  const apis = state.apis
    .filter((api) => state.filter === 'all' || api.status === statusFilters[state.filter])
    .filter((api) => `${api.name} ${api.path}`.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi') * (state.sortAscending ? 1 : -1));
  list.innerHTML = apis.length ? apis.map((api) => {
    const revealed = state.revealed.has(api.id);
    const key = state.apiKey ? (revealed ? esc(state.apiKey) : '••••••••') : 'Cấp riêng';
    const keyActions = state.apiKey ? `<button data-toggle="${esc(api.id)}">${revealed ? 'Ẩn' : 'Hiện'}</button><button data-copy-key="${esc(api.id)}">Copy</button>` : '';
    const statusClass = api.status === 'Đang hoạt động' ? 'active-status' : api.status === 'Đã hủy' ? 'cancelled-status' : 'paused-status';
    return `<tr data-id="${esc(api.id)}" class="${state.selected?.id === api.id ? 'selected' : ''}"><td><img class="row-icon" src="/icons/document_dark.svg" alt=""> <span class="api-name">${esc(api.name)}</span></td><td><span class="badge">${esc(api.type)}</span></td><td><span class="badge status-badge ${statusClass}">${esc(api.status)}</span></td><td>${esc(api.version)}</td><td><span class="badge gray">${esc(api.protocol)}</span></td><td><span class="badge green">${esc(api.auth)}</span></td><td class="key-cell"><code>${key}</code> ${keyActions}</td><td>${esc(location.origin)}</td></tr>`;
  }).join('') : '<tr><td colspan="8">Không tìm thấy API.</td></tr>';
}

function renderDetail(api) {
  state.selected = api;
  renderList();
  detail.classList.remove('hidden');
  const key = state.apiKey || '<API_KEY_DUOC_CAP>';
  const localTest = state.localAdmin ? `<h3>Run API</h3><div id="test-fields">${api.fields.map((field) => `<label>${esc(field.name)} <input data-field="${esc(field.name)}" value="${esc(api.sampleBody[field.name] ?? '')}" placeholder="${esc(field.description)}"></label>`).join('')}</div><button class="action" id="send-request">Gửi</button><pre class="response" id="response">Chưa gửi.</pre>` : '';
  detail.innerHTML = `<button class="close" id="close-detail" aria-label="Đóng">×</button><h2>${esc(api.name)}</h2>
    <h3>Endpoint</h3><pre>${esc(api.method)} ${esc(location.origin + api.path)}</pre>
    <h3>Postman</h3><pre id="snippet">${esc(api.method)} ${esc(location.origin + api.path)}\nX-API-Key: ${esc(key)}\nContent-Type: application/json\n\n${esc(JSON.stringify(api.sampleBody, null, 2))}</pre>
    <div class="actions"><button class="action" id="copy">Copy mẫu</button><button class="action" id="download-postman">Tải collection</button></div>${localTest}`;
  document.querySelector('#close-detail').onclick = () => { state.selected = null; detail.classList.add('hidden'); renderList(); };
  document.querySelector('#copy').onclick = async (event) => { await navigator.clipboard.writeText(document.querySelector('#snippet').innerText); event.currentTarget.textContent = 'Đã copy'; };
  document.querySelector('#download-postman').onclick = () => downloadPostmanCollection(api);
  if (state.localAdmin) document.querySelector('#send-request').onclick = sendTest;
}

function downloadPostmanCollection(api) {
  const collection = {
    info: { name: `HIS L2 API - ${api.name}`, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    item: [{ name: api.name, request: {
      method: api.method,
      header: [{ key: 'X-API-Key', value: state.apiKey || '<API_KEY_DUOC_CAP>', type: 'text' }, { key: 'Content-Type', value: 'application/json', type: 'text' }],
      body: { mode: 'raw', raw: JSON.stringify(api.sampleBody, null, 2), options: { raw: { language: 'json' } } },
      url: location.origin + api.path
    }}]
  };
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(collection, null, 2)], { type: 'application/json' }));
  link.download = `his-l2-${api.id}-postman.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function sendTest() {
  const output = document.querySelector('#response');
  const button = document.querySelector('#send-request');
  button.disabled = true;
  output.textContent = 'Đang gửi...';
  try {
    const body = Object.fromEntries([...detail.querySelectorAll('[data-field]')].map((input) => [input.dataset.field, input.value]));
    const response = await fetch(state.selected.path, { method: state.selected.method, headers: { 'content-type': 'application/json', 'x-api-key': state.apiKey }, body: JSON.stringify(body) });
    output.textContent = JSON.stringify(await response.json(), null, 2);
  } catch (error) { output.textContent = error.message; }
  finally { button.disabled = false; }
}

list.addEventListener('click', async (event) => {
  const toggle = event.target.closest('[data-toggle]');
  if (toggle) { const id = toggle.dataset.toggle; state.revealed.has(id) ? state.revealed.delete(id) : state.revealed.add(id); renderList(); return; }
  const copy = event.target.closest('[data-copy-key]');
  if (copy) { if (state.apiKey) await navigator.clipboard.writeText(state.apiKey); copy.textContent = 'Đã copy'; return; }
  const row = event.target.closest('[data-id]');
  if (row) renderDetail(state.apis.find((api) => api.id === row.dataset.id));
});
search.addEventListener('input', renderList);
document.querySelector('#toggle-search').onclick = () => {
  search.hidden = !search.hidden;
  if (!search.hidden) search.focus();
  else if (search.value) { search.value = ''; renderList(); }
};
document.querySelector('#sort-api').onclick = (event) => {
  state.sortAscending = !state.sortAscending;
  event.currentTarget.classList.toggle('active', !state.sortAscending);
  renderList();
};
document.querySelector('#filter-api').onclick = (event) => {
  const filters = ['all', 'active', 'paused', 'cancelled'];
  state.filter = filters[(filters.indexOf(state.filter) + 1) % filters.length];
  const labels = { all: 'Tất cả API', active: 'API đang hoạt động', paused: 'API tạm dừng', cancelled: 'API đã hủy' };
  event.currentTarget.title = labels[state.filter];
  event.currentTarget.classList.toggle('active', state.filter !== 'all');
  renderList();
};
document.querySelector('#connect-his').onclick = () => dialog.showModal();
document.querySelector('#close-dialog').onclick = () => dialog.close();
document.querySelector('#his-login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = new FormData(form);
  const errorBox = document.querySelector('#login-error');
  errorBox.textContent = '';
  try {
    const response = await fetch('/api/admin/his-session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: values.get('username'), password: values.get('password') }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || 'Đăng nhập thất bại');
    form.elements.password.value = '';
    dialog.close();
  } catch (error) { errorBox.textContent = error.message; }
});
async function refreshAuthStatus() {
  try {
    const health = await fetch('/api/health').then((response) => response.json());
    document.querySelector('#gateway-status').textContent = state.localAdmin ? (health.hisSession ? 'HIS đã kết nối' : 'HIS chưa kết nối') : 'API sẵn sàng';
    document.querySelector('#logout-his').hidden = !state.localAdmin || !health.hisSession;
  } catch { document.querySelector('#gateway-status').textContent = 'Gateway chưa kết nối'; }
}
document.querySelector('#logout-his').onclick = async () => {
  const response = await fetch('/api/admin/his-session', { method: 'DELETE' });
  if (!response.ok) return alert('Không đăng xuất được HIS.');
  await refreshAuthStatus();
};
dialog.addEventListener('close', refreshAuthStatus);
async function bootstrap() {
  try {
    const catalogResponse = await fetch('/api/catalog');
    const catalog = await catalogResponse.json();
    if (!catalogResponse.ok) throw new Error('Không tải được API');
    state.apis = catalog.data;

    const keyResponse = await fetch('/api/admin/api-key');
    if (keyResponse.ok) {
      const key = await keyResponse.json();
      state.localAdmin = true;
      state.apiKey = key.apiKey || '';
      document.querySelector('#connect-his').hidden = false;
    }

    renderList();
    await refreshAuthStatus();
  } catch {
    list.innerHTML = '<tr><td colspan="8">Không tải được API.</td></tr>';
  }
}
bootstrap();
