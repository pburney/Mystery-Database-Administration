import { api } from '../api.js';
import { renderNav, getUser } from '../components/nav.js';
import { flash } from '../components/flash.js';
import { renderPagination } from '../components/pagination.js';
import { fieldLabel } from '../components/field-renderer.js';
import { t } from '../lib/i18n.js';

let _state = {};

export async function render(root, [tableId] = []) {
  await getUser();
  renderNav(root, { title: t('common.loading') });

  root.innerHTML = `
    <div class="page-wrap">
      <div id="flash-area"></div>
      <div class="page-header">
        <h2 id="table-title" class="page-title"></h2>
        <div class="btn-group">
          <input id="search" type="search" placeholder="${t('list.searchPlaceholder')}" class="search-input">
          <a id="btn-add" href="#" class="btn btn-primary" style="display:none">${t('list.add')}</a>
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table" id="data-table">
          <thead><tr id="thead-row"></tr></thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
      <div id="pagination" class="pagination"></div>
    </div>
  `;

  _state = { tableId, page: 1, rows: 25, q: '', orderBy: '', dir: 'asc' };

  const schemaRes = await api.get(`/schema/${tableId}`);
  if (schemaRes.status !== 'ok') {
    flash(root.querySelector('#flash-area'), schemaRes.message);
    return;
  }

  const { table, fields, foreignKeys = [] } = schemaRes.data;
  renderNav(root, { title: table.table_display_name });
  root.querySelector('#table-title').textContent = table.table_display_name;

  const displayFields = table.table_default_display_fields
    ? table.table_default_display_fields.split(',').map(s => s.trim())
    : fields.map(f => f.name);

  // Fetch FK options for any FK fields visible in this list, build value→label lookup
  const fkFieldSet = new Set(foreignKeys.map(fk => fk.local_table_field));
  const fkLookup = {}; // { fieldName: { "rawValue": "label" } }
  await Promise.all(
    displayFields.filter(f => fkFieldSet.has(f)).map(async fieldName => {
      const res = await api.get(`/records/${tableId}/fk-options/${fieldName}`);
      if (res.status === 'ok') {
        fkLookup[fieldName] = Object.fromEntries(res.data.map(o => [String(o.value), o.label]));
      }
    })
  );

  const permsRes = await api.get(`/records/${tableId}?page=1&rows=1`);
  const canInsert = permsRes.status !== 'error' || permsRes.message !== 'Access denied';

  if (canInsert) {
    const btn = root.querySelector('#btn-add');
    btn.style.display = '';
    btn.href = `#/add/${tableId}`;
  }

  const theadRow = root.querySelector('#thead-row');
  for (const name of displayFields) {
    const th = document.createElement('th');
    th.textContent = fieldLabel(name);
    th.dataset.field = name;
    th.addEventListener('click', () => sortBy(name));
    theadRow.appendChild(th);
  }
  const actionsTh = document.createElement('th');
  actionsTh.className = 'col-actions';
  actionsTh.textContent = t('common.actions');
  theadRow.appendChild(actionsTh);

  root.querySelector('#search').addEventListener('input', e => {
    _state.q = e.target.value;
    _state.page = 1;
    loadData();
  });

  await loadData();

  async function loadData() {
    const { page, rows, q, orderBy, dir } = _state;
    let url = `/records/${tableId}?page=${page}&rows=${rows}&q=${encodeURIComponent(q)}`;
    if (orderBy) url += `&orderBy=${orderBy}&dir=${dir}`;

    const res = await api.get(url);
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
      td.className = 'table-empty';
      td.textContent = t('list.empty');
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    for (const record of records) {
      const tr = document.createElement('tr');
      for (const name of displayFields) {
        const td = document.createElement('td');
        const raw = record[name] ?? '';
        td.textContent = fkLookup[name]?.[String(raw)] ?? raw;
        tr.appendChild(td);
      }
      const pkVal = record[table.table_primary_key];
      const actionsTd = document.createElement('td');
      actionsTd.className = 'col-actions';
      actionsTd.innerHTML = `
        <a href="#/view/${tableId}/${pkVal}" class="action-view">${t('common.view')}</a>
        <a href="#/edit/${tableId}/${pkVal}" class="action-edit">${t('common.edit')}</a>
        <a href="#/delete/${tableId}/${pkVal}" class="action-delete">${t('common.delete')}</a>
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
