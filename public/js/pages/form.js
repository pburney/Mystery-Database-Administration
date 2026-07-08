import { api } from '../api.js';
import { renderNav, getUser } from '../components/nav.js';
import { flash } from '../components/flash.js';
import { renderField, collectFormData } from '../components/field-renderer.js';
import { t } from '../lib/i18n.js';

export async function render(root, [mode, tableId, pkValue] = []) {
  const isEdit = mode === 'edit';
  await getUser();
  renderNav(root);

  root.innerHTML = `
    <div class="page-wrap-sm">
      <div id="flash-area"></div>
      <div class="page-header">
        <h2 id="form-title" class="page-title">${isEdit ? t('form.editTitle') : t('form.addTitle')}</h2>
        <a href="#/list/${tableId}" class="back-link">${t('form.backToList')}</a>
      </div>
      <div class="page-card">
        <form id="record-form">
          <div id="fields-area"></div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">
              ${isEdit ? t('form.saveChanges') : t('form.create')}
            </button>
            <a href="#/list/${tableId}" class="btn btn-secondary">${t('common.cancel')}</a>
          </div>
        </form>
      </div>
    </div>
  `;

  const schemaRes = await api.get(`/schema/${tableId}`);
  if (schemaRes.status !== 'ok') {
    flash(root.querySelector('#flash-area'), schemaRes.message);
    return;
  }

  const { table, fields, foreignKeys = [], permissions } = schemaRes.data;
  renderNav(root, { title: table.table_display_name, crumbHref: `#/list/${tableId}` });
  root.querySelector('#form-title').textContent = isEdit
    ? t('form.editWord', { word: table.table_display_data_word })
    : t('form.addWord', { word: table.table_display_data_word });

  const canSave = isEdit ? permissions?.updateAccess : permissions?.insertAccess;
  const saveBtn = root.querySelector('#record-form .btn-primary');
  if (!canSave) {
    saveBtn.disabled = true;
    flash(root.querySelector('#flash-area'), t('form.readOnly'), 'info');
  }

  // Build FK field → options map, fetching all in parallel
  const fkByField = Object.fromEntries(foreignKeys.map(fk => [fk.local_table_field, fk]));
  const fkOptionsMap = {};
  await Promise.all(
    foreignKeys.map(async fk => {
      const res = await api.get(`/records/${tableId}/fk-options/${fk.local_table_field}`);
      if (res.status === 'ok') fkOptionsMap[fk.local_table_field] = res.data;
    })
  );

  let existingRecord = {};
  if (isEdit && pkValue) {
    const recRes = await api.get(`/records/${tableId}/${pkValue}`);
    if (recRes.status !== 'ok') {
      flash(root.querySelector('#flash-area'), recRes.message);
      return;
    }
    existingRecord = recRes.data;
  }

  const fieldsArea = root.querySelector('#fields-area');
  for (const field of fields) {
    const fkOptions = fkOptionsMap[field.name] ?? null;
    fieldsArea.appendChild(renderField(field, existingRecord[field.name] ?? null, { fkOptions }));
  }

  root.querySelector('#record-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (!canSave) return;
    const data = collectFormData(e.target, fields);
    const res = isEdit
      ? await api.put(`/records/${tableId}/${pkValue}`, data)
      : await api.post(`/records/${tableId}`, data);

    if (res.status === 'ok') {
      const pk = isEdit ? pkValue : res.data.pk;
      window.location.hash = `#/view/${tableId}/${pk}`;
    } else {
      flash(root.querySelector('#flash-area'), res.message);
    }
  });
}
