import { api } from '../../api.js';
import { renderNav, getUser } from '../../components/nav.js';
import { renderAdminNav } from '../../components/admin-nav.js';
import { flash } from '../../components/flash.js';
import { getBranding } from '../../lib/branding.js';
import { t } from '../../lib/i18n.js';

export async function render(root, params = []) {
  const user = await getUser();
  if (!user?.isAdmin) {
    window.location.hash = '#/menu';
    return;
  }

  if (params[0] === 'new') {
    await renderForm(root, null);
  } else if (params[0]) {
    await renderForm(root, parseInt(params[0], 10));
  } else {
    await renderList(root);
  }
}

async function renderList(root) {
  renderNav(root, { title: t('adminTables.crumb'), activePath: 'admin' });

  root.innerHTML = '';
  renderAdminNav(root, 'tables');
  root.insertAdjacentHTML('beforeend', `
    <div class="page-wrap">
      <div id="flash-area"></div>
      <div class="page-header">
        <h2 class="page-title">${t('adminTables.heading')}</h2>
        <a href="#/admin/tables/new" class="btn btn-primary">${t('adminTables.addButton')}</a>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>${t('adminTables.colDisplayName')}</th>
              <th>${t('adminTables.colRealName')}</th>
              <th>${t('adminTables.colDataWord')}</th>
              <th>${t('adminTables.colInMenu')}</th>
              <th class="col-actions">${t('common.actions')}</th>
            </tr>
          </thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
    </div>
  `);

  const res = await api.get('/admin/tables');
  if (res.status !== 'ok') {
    flash(root.querySelector('#flash-area'), res.message);
    return;
  }

  const tbody = root.querySelector('#tbody');
  if (!res.data.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty">${t('adminTables.empty')}</td></tr>`;
    return;
  }

  for (const tbl of res.data) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${esc(tbl.table_display_name)}</strong>${tbl.table_display_comment ? `<br><span class="text-muted" style="font-size:0.8em">${esc(tbl.table_display_comment)}</span>` : ''}</td>
      <td><code>${esc(tbl.table_real_name)}</code></td>
      <td>${esc(tbl.table_display_data_word)}</td>
      <td>${tbl.table_display_in_portal ? '✓' : '<span class="text-muted">—</span>'}</td>
      <td class="col-actions">
        <a href="#/admin/tables/${tbl.table_id}" class="action-edit">${t('common.edit')}</a>
        <button class="action-delete" data-id="${tbl.table_id}" data-name="${esc(tbl.table_display_name)}">${t('common.delete')}</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  tbody.addEventListener('click', async e => {
    const btn = e.target.closest('[data-id]');
    if (!btn) return;
    const { id, name } = btn.dataset;
    const { appName } = getBranding();
    if (!confirm(t('adminTables.confirmDelete', { name, appName }))) return;
    const del = await api.del(`/admin/tables/${id}`);
    if (del.status === 'ok') {
      btn.closest('tr').remove();
      flash(root.querySelector('#flash-area'), t('adminTables.removed', { name }), 'success');
    } else {
      flash(root.querySelector('#flash-area'), del.message);
    }
  });
}

async function renderForm(root, tableId) {
  const isEdit = tableId !== null;
  renderNav(root, { title: t('adminTables.crumb'), crumbHref: '#/admin/tables', activePath: 'admin' });

  root.innerHTML = '';
  renderAdminNav(root, 'tables');
  root.insertAdjacentHTML('beforeend', `
    <div class="page-wrap-sm">
      <div id="flash-area"></div>
      <div class="page-header">
        <h2 id="form-title" class="page-title">${isEdit ? t('adminTables.editTitle') : t('adminTables.addTitle')}</h2>
        <a href="#/admin/tables" class="back-link">${t('adminTables.backToList')}</a>
      </div>
      <div class="page-card">
        <form id="table-form">
          <fieldset class="admin-fieldset">
            <legend class="admin-legend">${t('adminTables.legendBasic')}</legend>
            <div class="form-group">
              <label class="form-label" for="f-real">${t('adminTables.labelRealName')} <span class="text-danger">*</span></label>
              <input id="f-real" name="table_real_name" class="form-input" required placeholder="e.g. tracks">
              <span class="form-hint">${t('adminTables.hintRealName')}</span>
            </div>
            <div class="form-group">
              <label class="form-label" for="f-display">${t('adminTables.labelDisplayName')} <span class="text-danger">*</span></label>
              <input id="f-display" name="table_display_name" class="form-input" required placeholder="e.g. Tracks">
            </div>
            <div class="form-group">
              <label class="form-label" for="f-comment">${t('adminTables.labelMenuSubtitle')}</label>
              <input id="f-comment" name="table_display_comment" class="form-input" placeholder="Short description shown on menu card">
            </div>
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label" for="f-word">${t('adminTables.labelDataWord')}</label>
                <input id="f-word" name="table_display_data_word" class="form-input" placeholder="Record">
                <span class="form-hint">Singular noun for one row (e.g. Track, Customer)</span>
              </div>
              <div class="form-group">
                <label class="form-label" for="f-pk">${t('adminTables.labelPrimaryKey')}</label>
                <input id="f-pk" name="table_primary_key" class="form-input" placeholder="id">
              </div>
            </div>
          </fieldset>

          <fieldset class="admin-fieldset">
            <legend class="admin-legend">${t('adminTables.legendBrowse')}</legend>
            <div class="form-group">
              <label class="form-label" for="f-fields">${t('adminTables.labelDisplayFields')}</label>
              <input id="f-fields" name="table_default_display_fields" class="form-input" placeholder="e.g. Name,Title,Price">
              <span class="form-hint">${t('adminTables.hintDisplayFields')}</span>
            </div>
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label" for="f-rows">${t('adminTables.labelRowsPerPage')}</label>
                <input id="f-rows" name="table_default_display_rows" type="number" step="1" min="5" max="200" class="form-input" placeholder="25">
              </div>
              <div class="form-group">
                <label class="form-label" for="f-order">${t('adminTables.labelDefaultSort')}</label>
                <input id="f-order" name="table_default_order_field" class="form-input" placeholder="Leave blank for no default sort">
              </div>
            </div>
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label" for="f-action">${t('adminTables.labelDefaultAction')}</label>
                <select id="f-action" name="table_default_action" class="form-select">
                  <option value="list">${t('adminTables.optionList')}</option>
                  <option value="view">${t('adminTables.optionView')}</option>
                </select>
              </div>
              <div class="form-group" style="justify-content:flex-end">
                <label class="form-label form-checkbox-label">
                  <input type="checkbox" name="table_default_reverse_sort" value="1" class="form-checkbox">
                  ${t('adminTables.labelReverseSort')}
                </label>
              </div>
            </div>
          </fieldset>

          <fieldset class="admin-fieldset">
            <legend class="admin-legend">${t('adminTables.legendVisibility')}</legend>
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label form-checkbox-label">
                  <input type="checkbox" name="table_display_in_portal" value="1" class="form-checkbox" checked>
                  ${t('adminTables.labelShowInMenu')}
                </label>
                <span class="form-hint">${t('adminTables.hintShowInMenu')}</span>
              </div>
              <div class="form-group">
                <label class="form-label form-checkbox-label">
                  <input type="checkbox" name="table_is_many_to_many" value="1" class="form-checkbox">
                  ${t('adminTables.labelManyToMany')}
                </label>
                <span class="form-hint">${t('adminTables.hintManyToMany')}</span>
              </div>
            </div>
          </fieldset>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">${isEdit ? t('form.saveChanges') : t('adminTables.createButton')}</button>
            <a href="#/admin/tables" class="btn btn-secondary">${t('common.cancel')}</a>
          </div>
        </form>

        ${isEdit ? `
        <div id="fk-section" class="admin-fieldset" style="margin-top:1.5rem">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
            <h3 style="font-size:0.8125rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--m-text-muted);margin:0">${t('adminTables.fkHeading')}</h3>
          </div>
          <div id="fk-list"><span class="text-muted">${t('common.loading')}</span></div>
          <details style="margin-top:1rem">
            <summary style="cursor:pointer;font-size:0.875rem;font-weight:500;color:var(--m-accent);padding:0.25rem 0">${t('adminTables.fkAddSummary')}</summary>
            <div style="margin-top:0.75rem;padding:0.75rem;background:var(--m-page-bg);border-radius:0.375rem;border:1px solid var(--m-border)">
              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">${t('adminTables.fkLocalField')} <span class="text-danger">*</span></label>
                  <input id="fk-local-field" class="form-input" placeholder="e.g. genre_id">
                  <span class="form-hint">${t('adminTables.fkHintLocal')}</span>
                </div>
                <div class="form-group">
                  <label class="form-label">${t('adminTables.fkForeignTable')} <span class="text-danger">*</span></label>
                  <select id="fk-foreign-table" class="form-select"><option value="">${t('adminTables.fkSelectTable')}</option></select>
                </div>
              </div>
              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">${t('adminTables.fkValueField')} <span class="text-danger">*</span></label>
                  <input id="fk-value-field" class="form-input" placeholder="e.g. genre_id">
                  <span class="form-hint">${t('adminTables.fkHintValue')}</span>
                </div>
                <div class="form-group">
                  <label class="form-label">${t('adminTables.fkLabelField')} <span class="text-danger">*</span></label>
                  <input id="fk-label-field" class="form-input" placeholder="e.g. name or first_name,last_name">
                  <span class="form-hint">${t('adminTables.fkHintLabel')}</span>
                </div>
              </div>
              <button id="btn-add-fk" class="btn btn-primary" style="margin-top:0.5rem">${t('adminTables.fkAddButton')}</button>
            </div>
          </details>
        </div>` : ''}
      </div>
    </div>
  `);

  let tableData = null;
  if (isEdit) {
    const res = await api.get(`/admin/tables/${tableId}`);
    if (res.status !== 'ok') {
      flash(root.querySelector('#flash-area'), res.message);
      return;
    }
    tableData = res.data;
    populateForm(root.querySelector('#table-form'), tableData);
    root.querySelector('#form-title').textContent = t('adminTables.editPrefix', { name: tableData.table_display_name });
    await loadFkSection(root, tableId);
  }

  root.querySelector('#table-form').addEventListener('submit', async e => {
    e.preventDefault();
    const data = collectAdminForm(e.target);
    const res = isEdit
      ? await api.put(`/admin/tables/${tableId}`, data)
      : await api.post('/admin/tables', data);
    if (res.status === 'ok') {
      window.location.hash = '#/admin/tables';
    } else {
      flash(root.querySelector('#flash-area'), res.message);
    }
  });
}

function populateForm(form, data) {
  for (const [key, val] of Object.entries(data)) {
    const el = form.elements[key];
    if (!el) continue;
    if (el.type === 'checkbox') {
      el.checked = Boolean(val);
    } else {
      el.value = val ?? '';
    }
  }
}

function collectAdminForm(form) {
  const data = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') {
      data[el.name] = el.checked ? 1 : 0;
    } else {
      data[el.name] = el.value === '' ? null : el.value;
    }
  }
  return data;
}

async function loadFkSection(root, tableId) {
  const fkList = root.querySelector('#fk-list');
  if (!fkList) return;

  // Populate foreign table selector
  const allTablesRes = await api.get('/admin/tables');
  const allTables = allTablesRes.status === 'ok' ? allTablesRes.data : [];
  const fkForeignSel = root.querySelector('#fk-foreign-table');
  for (const at of allTables) {
    const opt = document.createElement('option');
    opt.value = at.table_id;
    opt.textContent = `${at.table_display_name} (${at.table_real_name})`;
    fkForeignSel?.appendChild(opt);
  }

  const renderFkList = async () => {
    const schemaRes = await api.get(`/schema/${tableId}`);
    const fks = schemaRes.status === 'ok' ? (schemaRes.data.foreignKeys || []) : [];
    const tableMap = Object.fromEntries(allTables.map(at => [at.table_id, at]));

    if (!fks.length) {
      fkList.innerHTML = `<span class="text-muted" style="font-size:0.875rem">${t('adminTables.fkEmpty')}</span>`;
    } else {
      fkList.innerHTML = '';
      for (const fk of fks) {
        const foreign = tableMap[fk.foreign_table_id];
        const row = document.createElement('div');
        row.className = 'fk-row';
        row.style.cssText = 'display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0;border-bottom:1px solid var(--m-border);font-size:0.875rem';
        row.innerHTML = `
          <code style="flex:1">${esc(fk.local_table_field)}</code>
          <span class="text-muted">→</span>
          <code style="flex:2">${foreign ? esc(foreign.table_real_name) : `table #${fk.foreign_table_id}`}.${esc(fk.foreign_table_value_field)}</code>
          <span class="text-muted" style="flex:2">${t('adminTables.fkLabelPrefix')} ${esc(fk.foreign_table_label_field)}</span>
          <button class="btn btn-danger btn-sm" data-fk-id="${fk.fk_id}" style="padding:0.2rem 0.5rem;font-size:0.75rem">${t('adminTables.fkRemove')}</button>
        `;
        fkList.appendChild(row);
      }
    }

    fkList.addEventListener('click', async e => {
      const btn = e.target.closest('[data-fk-id]');
      if (!btn) return;
      if (!confirm(t('adminTables.fkConfirmRemove'))) return;
      const del = await api.del(`/admin/fk/${btn.dataset.fkId}`);
      if (del.status === 'ok') {
        await renderFkList();
      }
    }, { once: true });
  };

  await renderFkList();

  root.querySelector('#btn-add-fk')?.addEventListener('click', async () => {
    const localField = root.querySelector('#fk-local-field').value.trim();
    const foreignTableId = root.querySelector('#fk-foreign-table').value;
    const valueField = root.querySelector('#fk-value-field').value.trim();
    const labelField = root.querySelector('#fk-label-field').value.trim();
    if (!localField || !foreignTableId || !valueField || !labelField) {
      alert(t('adminTables.fkAlertRequired'));
      return;
    }
    const res = await api.post('/admin/fk', {
      local_table_id: tableId,
      local_table_field: localField,
      foreign_table_id: parseInt(foreignTableId, 10),
      foreign_table_value_field: valueField,
      foreign_table_label_field: labelField,
    });
    if (res.status === 'ok') {
      root.querySelector('#fk-local-field').value = '';
      root.querySelector('#fk-foreign-table').value = '';
      root.querySelector('#fk-value-field').value = '';
      root.querySelector('#fk-label-field').value = '';
      await renderFkList();
    } else {
      alert(res.message);
    }
  });
}

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
