import { api } from '../api.js';
import { renderNav, getUser } from '../components/nav.js';
import { flash } from '../components/flash.js';

export async function render(root) {
  const user = await getUser();
  if (!user) {
    window.location.hash = '#/login';
    return;
  }
  renderNav(root, { title: '' });

  root.innerHTML = `
    <div class="page-wrap">
      <div id="flash-area"></div>
      <h2 class="section-title">Database Tables</h2>
      <div id="table-grid" class="table-grid"></div>
      <div id="plugin-section" style="display:none; margin-top:2rem">
        <h2 class="section-title">Tools</h2>
        <div id="plugin-grid" class="table-grid"></div>
      </div>
    </div>
  `;

  const res = await api.get('/menu');
  if (res.status !== 'ok') {
    flash(root.querySelector('#flash-area'), res.message);
    return;
  }

  const { tables, plugins } = res.data;
  const tableGrid = root.querySelector('#table-grid');

  if (!tables.length) {
    tableGrid.innerHTML = `<p class="text-muted" style="grid-column:1/-1">No tables configured yet.${user.isAdmin ? ' <a href="#/admin/tables">Add one</a>' : ' Ask an administrator to set up access.'}</p>`;
  }

  for (const table of tables) {
    const card = document.createElement('a');
    card.href = `#/list/${table.table_id}`;
    card.className = 'table-card';
    card.innerHTML = `
      <div class="table-card-title">${table.table_display_name}</div>
      <div class="table-card-hint">Browse →</div>
    `;
    tableGrid.appendChild(card);
  }

  if (plugins.length) {
    root.querySelector('#plugin-section').style.display = '';
    const pluginGrid = root.querySelector('#plugin-grid');
    for (const plugin of plugins) {
      const card = document.createElement('a');
      card.href = `#/plugin/${plugin.plugin_key}`;
      card.className = 'table-card';
      card.innerHTML = `<div class="table-card-title">${plugin.plugin_label}</div>`;
      pluginGrid.appendChild(card);
    }
  }
}
