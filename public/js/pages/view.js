import { api } from '../api.js';
import { renderNav, getUser } from '../components/nav.js';
import { flash } from '../components/flash.js';
import { fieldLabel } from '../components/field-renderer.js';

export async function render(root, [tableId, pkValue] = []) {
  await getUser();
  renderNav(root);

  root.innerHTML = `
    <div class="max-w-2xl mx-auto p-4">
      <div id="flash-area"></div>
      <div class="flex items-center justify-between mb-4">
        <h2 id="table-title" class="text-xl font-semibold">View Record</h2>
        <div class="flex gap-2">
          <a href="#/list/${tableId}" class="text-sm text-gray-500 hover:underline">← Back to list</a>
          <a href="#/edit/${tableId}/${pkValue}" class="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded">Edit</a>
          <a href="#/delete/${tableId}/${pkValue}" class="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded">Delete</a>
        </div>
      </div>
      <div id="content" class="bg-white rounded shadow p-6 space-y-4"></div>
    </div>
  `;

  const [schemaRes, recordRes] = await Promise.all([
    api.get(`/schema/${tableId}`),
    api.get(`/records/${tableId}/${pkValue}`),
  ]);

  if (schemaRes.status !== 'ok' || recordRes.status !== 'ok') {
    flash(root.querySelector('#flash-area'), (schemaRes.message || recordRes.message));
    return;
  }

  const { table, fields } = schemaRes.data;
  const record = recordRes.data;
  renderNav(root, { title: table.table_display_name });
  root.querySelector('#table-title').textContent = `View ${table.table_display_data_word}`;

  const content = root.querySelector('#content');
  for (const field of fields) {
    const row = document.createElement('div');
    row.className = 'flex flex-col gap-0.5';
    const lbl = document.createElement('span');
    lbl.className = 'text-xs font-medium text-gray-500 uppercase tracking-wide';
    lbl.textContent = fieldLabel(field.name);
    const val = document.createElement('span');
    val.className = 'text-sm text-gray-900';
    val.textContent = record[field.name] ?? '—';
    row.appendChild(lbl);
    row.appendChild(val);
    content.appendChild(row);
  }
}
