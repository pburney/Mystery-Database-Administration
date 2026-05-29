import { api } from '../api.js';
import { renderNav, getUser } from '../components/nav.js';
import { flash } from '../components/flash.js';
import { renderPagination } from '../components/pagination.js';
import { fieldLabel } from '../components/field-renderer.js';

let _state = {};

export async function render(root, [tableId] = []) {
  await getUser();
  renderNav(root, { title: 'Loading...' });

  root.innerHTML = `
    <div class="max-w-6xl mx-auto p-4">
      <div id="flash-area"></div>
      <div class="flex items-center justify-between mb-4">
        <h2 id="table-title" class="text-xl font-semibold"></h2>
        <div class="flex gap-2">
          <input id="search" type="search" placeholder="Search…"
            class="border border-gray-300 rounded px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <a id="btn-add" href="#" class="hidden bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded">+ Add</a>
        </div>
      </div>
      <div class="bg-white rounded shadow overflow-x-auto">
        <table class="min-w-full text-sm" id="data-table">
          <thead class="bg-gray-50 border-b"><tr id="thead-row"></tr></thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
      <div id="pagination" class="flex items-center gap-2 mt-4"></div>
    </div>
  `;

  _state = { tableId, page: 1, rows: 25, q: '' };

  const schemaRes = await api.get(`/schema/${tableId}`);
  if (schemaRes.status !== 'ok') {
    flash(root.querySelector('#flash-area'), schemaRes.message);
    return;
  }

  const { table, fields } = schemaRes.data;
  renderNav(root, { title: table.table_display_name });
  root.querySelector('#table-title').textContent = table.table_display_name;

  const displayFields = table.table_default_display_fields
    ? table.table_default_display_fields.split(',').map(s => s.trim())
    : fields.map(f => f.name);

  const permsRes = await api.get(`/records/${tableId}?page=1&rows=1`);
  const canInsert = permsRes.status !== 'error' || permsRes.message !== 'Access denied';

  if (canInsert) {
    const btn = root.querySelector('#btn-add');
    btn.classList.remove('hidden');
    btn.href = `#/add/${tableId}`;
  }

  // Build table header
  const theadRow = root.querySelector('#thead-row');
  for (const name of displayFields) {
    const th = document.createElement('th');
    th.className = 'px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap cursor-pointer hover:text-blue-600';
    th.textContent = fieldLabel(name);
    th.dataset.field = name;
    th.addEventListener('click', () => sortBy(name));
    theadRow.appendChild(th);
  }
  const actionsTh = document.createElement('th');
  actionsTh.className = 'px-3 py-2 text-right';
  actionsTh.textContent = 'Actions';
  theadRow.appendChild(actionsTh);

  root.querySelector('#search').addEventListener('input', e => {
    _state.q = e.target.value;
    _state.page = 1;
    loadData();
  });

  await loadData();

  async function loadData() {
    const { page, rows, q } = _state;
    const res = await api.get(`/records/${tableId}?page=${page}&rows=${rows}&q=${encodeURIComponent(q)}`);
    if (res.status !== 'ok') {
      flash(root.querySelector('#flash-area'), res.message);
      return;
    }
    const { data: records, total } = res.data;
    const tbody = root.querySelector('#tbody');
    tbody.innerHTML = '';

    if (!records.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = displayFields.length + 1;
      td.className = 'px-3 py-6 text-center text-gray-400';
      td.textContent = 'No records found.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    for (const record of records) {
      const tr = document.createElement('tr');
      tr.className = 'border-b hover:bg-gray-50';
      for (const name of displayFields) {
        const td = document.createElement('td');
        td.className = 'px-3 py-2 max-w-xs truncate';
        td.textContent = record[name] ?? '';
        tr.appendChild(td);
      }
      const pkVal = record[table.table_primary_key];
      const actionsTd = document.createElement('td');
      actionsTd.className = 'px-3 py-2 text-right whitespace-nowrap';
      actionsTd.innerHTML = `
        <a href="#/view/${tableId}/${pkVal}" class="text-blue-600 hover:underline mr-2 text-xs">View</a>
        <a href="#/edit/${tableId}/${pkVal}" class="text-indigo-600 hover:underline mr-2 text-xs">Edit</a>
        <a href="#/delete/${tableId}/${pkVal}" class="text-red-600 hover:underline text-xs">Delete</a>
      `;
      tr.appendChild(actionsTd);
      tbody.appendChild(tr);
    }

    renderPagination(root.querySelector('#pagination'), {
      page: _state.page,
      rows: _state.rows,
      total,
      onPage: p => { _state.page = p; loadData(); },
    });
  }

  function sortBy(field) {
    if (_state.orderBy === field) {
      _state.dir = _state.dir === 'asc' ? 'desc' : 'asc';
    } else {
      _state.orderBy = field;
      _state.dir = 'asc';
    }
    _state.page = 1;
    loadData();
  }
}
