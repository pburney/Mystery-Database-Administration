import { api } from '../api.js';
import { renderNav, getUser } from '../components/nav.js';
import { flash } from '../components/flash.js';
import { fieldLabel } from '../components/field-renderer.js';

export async function render(root, [tableId, pkValue] = []) {
  await getUser();
  renderNav(root);

  root.innerHTML = `
    <div class="page-wrap-sm">
      <div id="flash-area"></div>
      <div class="page-header">
        <h2 id="table-title" class="page-title">View Record</h2>
        <div class="btn-group">
          <a href="#/list/${tableId}" class="back-link">← Back</a>
          <a href="#/edit/${tableId}/${pkValue}" class="btn btn-edit">Edit</a>
          <a href="#/delete/${tableId}/${pkValue}" class="btn btn-danger">Delete</a>
        </div>
      </div>
      <div id="content" class="page-card"></div>
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

  const { table, fields, foreignKeys = [] } = schemaRes.data;
  const record = recordRes.data;
  renderNav(root, { title: table.table_display_name, crumbHref: `#/list/${tableId}` });
  root.querySelector('#table-title').textContent = `View ${table.table_display_data_word}`;

  // Resolve FK labels
  const fkLookup = {};
  await Promise.all(
    foreignKeys.map(async fk => {
      const res = await api.get(`/records/${tableId}/fk-options/${fk.local_table_field}`);
      if (res.status === 'ok') {
        fkLookup[fk.local_table_field] = Object.fromEntries(res.data.map(o => [String(o.value), o.label]));
      }
    })
  );

  const content = root.querySelector('#content');
  for (const field of fields) {
    const row = document.createElement('div');
    row.className = 'field-row';
    const lbl = document.createElement('span');
    lbl.className = 'field-label';
    lbl.textContent = fieldLabel(field.name);
    const val = document.createElement('span');
    val.className = 'field-value';
    const raw = record[field.name] ?? null;
    val.textContent = raw != null
      ? (fkLookup[field.name]?.[String(raw)] ?? raw)
      : '—';
    row.appendChild(lbl);
    row.appendChild(val);
    content.appendChild(row);
  }
}
