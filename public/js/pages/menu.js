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
    <div class="max-w-4xl mx-auto p-4">
      <div id="flash-area"></div>
      <h2 class="text-xl font-semibold mb-4">Database Tables</h2>
      <div id="table-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"></div>
      <div id="plugin-section" class="hidden mt-8">
        <h2 class="text-xl font-semibold mb-4">Tools</h2>
        <div id="plugin-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"></div>
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
    tableGrid.innerHTML = `<p class="text-gray-400 col-span-full">No tables configured yet. ${user.isAdmin ? '<a href="#/admin/tables" class="underline text-blue-600">Add one</a>' : 'Ask an administrator to set up access.'}</p>`;
  }

  for (const table of tables) {
    const card = document.createElement('a');
    card.href = `#/list/${table.table_id}`;
    card.className = 'block bg-white rounded shadow p-4 hover:shadow-md hover:bg-blue-50 transition';
    card.innerHTML = `
      <div class="font-medium text-gray-800">${table.table_display_name}</div>
      <div class="text-xs text-gray-400 mt-1">Browse →</div>
    `;
    tableGrid.appendChild(card);
  }

  if (plugins.length) {
    root.querySelector('#plugin-section').classList.remove('hidden');
    const pluginGrid = root.querySelector('#plugin-grid');
    for (const plugin of plugins) {
      const card = document.createElement('a');
      card.href = `#/plugin/${plugin.plugin_key}`;
      card.className = 'block bg-white rounded shadow p-4 hover:shadow-md hover:bg-blue-50 transition';
      card.innerHTML = `<div class="font-medium text-gray-800">${plugin.plugin_label}</div>`;
      pluginGrid.appendChild(card);
    }
  }
}
