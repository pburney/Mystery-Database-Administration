import { api } from '../api.js';
import { renderNav, getUser } from '../components/nav.js';
import { flash } from '../components/flash.js';
import { fieldLabel } from '../components/field-renderer.js';

export async function render(root, [tableId, pkValue] = []) {
  await getUser();
  renderNav(root);

  root.innerHTML = `
    <div class="page-wrap-xs">
      <div id="flash-area"></div>
      <div class="page-card">
        <h2 class="page-title text-danger" style="margin-bottom:1rem">Confirm Delete</h2>
        <div id="record-summary" style="margin-bottom:1.5rem; font-size:0.875rem; color:var(--m-text)"></div>
        <div class="btn-group">
          <button id="btn-confirm" class="btn btn-danger">Yes, delete this record</button>
          <a href="#/list/${tableId}" class="btn btn-secondary">Cancel</a>
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
  renderNav(root, { title: table.table_display_name, crumbHref: `#/list/${tableId}` });

  const summary = root.querySelector('#record-summary');
  const intro = document.createElement('p');
  intro.className = 'text-muted';
  intro.style.marginBottom = '0.75rem';
  intro.textContent = `You are about to permanently delete this ${table.table_display_data_word.toLowerCase()}:`;
  summary.appendChild(intro);

  for (const field of fields.slice(0, 5)) {
    const p = document.createElement('p');
    p.style.marginBottom = '0.25rem';
    p.innerHTML = `<strong>${fieldLabel(field.name)}:</strong> ${record[field.name] ?? '—'}`;
    summary.appendChild(p);
  }
  if (fields.length > 5) {
    const more = document.createElement('p');
    more.className = 'text-muted';
    more.style.fontStyle = 'italic';
    more.style.marginTop = '0.25rem';
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
