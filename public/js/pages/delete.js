import { api } from '../api.js';
import { renderNav, getUser } from '../components/nav.js';
import { flash } from '../components/flash.js';
import { fieldLabel } from '../components/field-renderer.js';

export async function render(root, [tableId, pkValue] = []) {
  await getUser();
  renderNav(root);

  root.innerHTML = `
    <div class="max-w-xl mx-auto p-4">
      <div id="flash-area"></div>
      <div class="bg-white rounded shadow p-6">
        <h2 class="text-xl font-semibold mb-4 text-red-700">Confirm Delete</h2>
        <div id="record-summary" class="mb-6 space-y-1 text-sm text-gray-700"></div>
        <div class="flex gap-2">
          <button id="btn-confirm" class="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded">
            Yes, delete this record
          </button>
          <a href="#/list/${tableId}" class="text-sm px-4 py-2 border rounded hover:bg-gray-50">Cancel</a>
        </div>
      </div>
    </div>
  `;

  const [schemaRes, recordRes] = await Promise.all([
    api.get(`/schema/${tableId}`),
    api.get(`/records/${tableId}/${pkValue}`),
  ]);

  if (schemaRes.status !== 'ok' || recordRes.status !== 'ok') {
    flash(root.querySelector('#flash-area'), schemaRes.message || recordRes.message);
    return;
  }

  const { table, fields } = schemaRes.data;
  const record = recordRes.data;
  renderNav(root, { title: table.table_display_name });

  const summary = root.querySelector('#record-summary');
  summary.innerHTML = `<p class="mb-2 text-gray-500">You are about to permanently delete this ${table.table_display_data_word.toLowerCase()}:</p>`;
  for (const field of fields.slice(0, 5)) {
    const p = document.createElement('p');
    p.innerHTML = `<strong>${fieldLabel(field.name)}:</strong> ${record[field.name] ?? '—'}`;
    summary.appendChild(p);
  }
  if (fields.length > 5) {
    const more = document.createElement('p');
    more.className = 'text-gray-400 italic';
    more.textContent = `…and ${fields.length - 5} more fields`;
    summary.appendChild(more);
  }

  root.querySelector('#btn-confirm').addEventListener('click', async () => {
    const res = await api.del(`/records/${tableId}/${pkValue}`);
    if (res.status === 'ok') {
      window.location.hash = `#/list/${tableId}`;
    } else {
      flash(root.querySelector('#flash-area'), res.message);
    }
  });
}
