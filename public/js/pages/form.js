import { api } from '../api.js';
import { renderNav, getUser } from '../components/nav.js';
import { flash } from '../components/flash.js';
import { renderField, collectFormData } from '../components/field-renderer.js';

export async function render(root, [mode, tableId, pkValue] = []) {
  // mode is 'add' or 'edit' — injected by app.js routing
  const isEdit = mode === 'edit';
  await getUser();
  renderNav(root);

  root.innerHTML = `
    <div class="max-w-2xl mx-auto p-4">
      <div id="flash-area"></div>
      <div class="flex items-center justify-between mb-4">
        <h2 id="form-title" class="text-xl font-semibold">${isEdit ? 'Edit' : 'Add'} Record</h2>
        <a href="#/list/${tableId}" class="text-sm text-gray-500 hover:underline">← Back to list</a>
      </div>
      <form id="record-form" class="bg-white rounded shadow p-6 space-y-4">
        <div id="fields-area"></div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded">
            ${isEdit ? 'Save changes' : 'Create'}
          </button>
          <a href="#/list/${tableId}" class="text-sm px-4 py-2 border rounded hover:bg-gray-50">Cancel</a>
        </div>
      </form>
    </div>
  `;

  const schemaRes = await api.get(`/schema/${tableId}`);
  if (schemaRes.status !== 'ok') {
    flash(root.querySelector('#flash-area'), schemaRes.message);
    return;
  }

  const { table, fields } = schemaRes.data;
  renderNav(root, { title: table.table_display_name });
  root.querySelector('#form-title').textContent = `${isEdit ? 'Edit' : 'Add'} ${table.table_display_data_word}`;

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
    fieldsArea.appendChild(renderField(field, existingRecord[field.name] ?? null));
  }

  root.querySelector('#record-form').addEventListener('submit', async e => {
    e.preventDefault();
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
