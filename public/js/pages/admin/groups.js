import { api } from '../../api.js';
import { renderNav, getUser } from '../../components/nav.js';
import { renderAdminNav } from '../../components/admin-nav.js';
import { flash } from '../../components/flash.js';

export async function render(root, params = []) {
  const user = await getUser();
  if (!user?.isAdmin) {
    window.location.hash = '#/menu';
    return;
  }

  if (params[0] === 'new') {
    await renderForm(root, null);
  } else if (params[1] === 'permissions') {
    await renderPermissions(root, parseInt(params[0], 10));
  } else if (params[0]) {
    await renderForm(root, parseInt(params[0], 10));
  } else {
    await renderList(root);
  }
}

async function renderList(root) {
  renderNav(root, { title: 'Admin: Groups', activePath: 'admin' });
  root.innerHTML = '';
  renderAdminNav(root, 'groups');
  root.insertAdjacentHTML('beforeend', `
    <div class="page-wrap">
      <div id="flash-area"></div>
      <div class="page-header">
        <h2 class="page-title">Groups</h2>
        <a href="#/admin/groups/new" class="btn btn-primary">+ Add Group</a>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Group Name</th>
              <th>Description</th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
    </div>
  `);

  const res = await api.get('/admin/groups');
  if (res.status !== 'ok') {
    flash(root.querySelector('#flash-area'), res.message);
    return;
  }

  const tbody = root.querySelector('#tbody');
  if (!res.data.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="table-empty">No groups found.</td></tr>`;
    return;
  }

  for (const g of res.data) {
    const isPrimary = g.group_id === 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${esc(g.group_name)}</strong>${isPrimary ? ' <span class="text-muted" style="font-size:0.75em">(Administrators)</span>' : ''}</td>
      <td>${esc(g.group_desc) || '<span class="text-muted">—</span>'}</td>
      <td class="col-actions">
        <a href="#/admin/groups/${g.group_id}" class="action-edit">Edit</a>
        <a href="#/admin/groups/${g.group_id}/permissions" class="action-view">Permissions</a>
        <button class="action-delete" data-id="${g.group_id}" data-name="${esc(g.group_name)}"${isPrimary ? ' disabled title="Cannot delete Administrators group"' : ''}>Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  tbody.addEventListener('click', async e => {
    const btn = e.target.closest('button[data-id]:not([disabled])');
    if (!btn) return;
    const { id, name } = btn.dataset;
    if (!confirm(`Delete group "${name}"?\n\nUsers in this group will lose any access it granted.`)) return;
    const del = await api.del(`/admin/groups/${id}`);
    if (del.status === 'ok') {
      btn.closest('tr').remove();
      flash(root.querySelector('#flash-area'), `Group "${name}" deleted.`, 'success');
    } else {
      flash(root.querySelector('#flash-area'), del.message);
    }
  });
}

async function renderForm(root, groupId) {
  const isEdit = groupId !== null;
  renderNav(root, { title: 'Admin: Groups', crumbHref: '#/admin/groups', activePath: 'admin' });
  root.innerHTML = '';
  renderAdminNav(root, 'groups');
  root.insertAdjacentHTML('beforeend', `
    <div class="page-wrap-xs">
      <div id="flash-area"></div>
      <div class="page-header">
        <h2 id="form-title" class="page-title">${isEdit ? 'Edit Group' : 'Add Group'}</h2>
        <a href="#/admin/groups" class="back-link">← Back to Groups</a>
      </div>
      <div class="page-card">
        <form id="group-form">
          <div class="form-group">
            <label class="form-label" for="f-name">Group Name <span class="text-danger">*</span></label>
            <input id="f-name" name="group_name" class="form-input" required placeholder="e.g. Editors">
          </div>
          <div class="form-group">
            <label class="form-label" for="f-desc">Description</label>
            <input id="f-desc" name="group_desc" class="form-input" placeholder="Short description of this group's role">
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">${isEdit ? 'Save changes' : 'Create group'}</button>
            <a href="#/admin/groups" class="btn btn-secondary">Cancel</a>
            ${isEdit ? `<a href="#/admin/groups/${groupId}/permissions" class="btn btn-secondary" style="margin-left:auto">Permissions →</a>` : ''}
          </div>
        </form>
      </div>
    </div>
  `);

  if (isEdit) {
    const res = await api.get('/admin/groups');
    const group = (res.data || []).find(g => g.group_id === groupId);
    if (!group) {
      flash(root.querySelector('#flash-area'), 'Group not found.');
      return;
    }
    root.querySelector('#form-title').textContent = `Edit: ${group.group_name}`;
    root.querySelector('[name="group_name"]').value = group.group_name;
    root.querySelector('[name="group_desc"]').value = group.group_desc || '';
  }

  root.querySelector('#group-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const data = {
      group_name: form.elements.group_name.value,
      group_desc: form.elements.group_desc.value || '',
    };
    const res = isEdit
      ? await api.put(`/admin/groups/${groupId}`, data)
      : await api.post('/admin/groups', data);
    if (res.status === 'ok') {
      window.location.hash = '#/admin/groups';
    } else {
      flash(root.querySelector('#flash-area'), res.message);
    }
  });
}

async function renderPermissions(root, groupId) {
  renderNav(root, { title: 'Admin: Groups', crumbHref: '#/admin/groups', activePath: 'admin' });
  root.innerHTML = '';
  renderAdminNav(root, 'groups');
  root.insertAdjacentHTML('beforeend', `
    <div class="page-wrap">
      <div id="flash-area"></div>
      <div class="page-header">
        <h2 id="perm-title" class="page-title">Permissions</h2>
        <div class="btn-group">
          <a href="#/admin/groups" class="back-link">← Back to Groups</a>
          <button id="btn-save" class="btn btn-primary">Save Permissions</button>
        </div>
      </div>
      <p class="text-muted" style="margin-bottom:1rem;font-size:0.875rem">
        Check the operations this group may perform on each table.
        Administrators always have full access regardless of these settings.
      </p>
      <div class="table-wrap">
        <table class="data-table" id="perm-table">
          <thead>
            <tr>
              <th>Table</th>
              <th style="text-align:center;width:70px">Select</th>
              <th style="text-align:center;width:70px">Insert</th>
              <th style="text-align:center;width:70px">Update</th>
              <th style="text-align:center;width:70px">Delete</th>
            </tr>
          </thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
    </div>
  `);

  const [tablesRes, permsRes, groupsRes] = await Promise.all([
    api.get('/admin/tables'),
    api.get(`/admin/groups/${groupId}/permissions`),
    api.get('/admin/groups'),
  ]);

  if (tablesRes.status !== 'ok' || permsRes.status !== 'ok') {
    flash(root.querySelector('#flash-area'), tablesRes.message || permsRes.message);
    return;
  }

  const group = (groupsRes.data || []).find(g => g.group_id === groupId);
  if (group) root.querySelector('#perm-title').textContent = `Permissions: ${group.group_name}`;

  // Build a lookup: tableId → { selectAccess, insertAccess, updateAccess, deleteAccess }
  const existing = {};
  for (const p of permsRes.data) {
    existing[p.table_id] = p;
  }

  const tbody = root.querySelector('#tbody');
  const tables = tablesRes.data;

  if (!tables.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No tables configured yet. Add tables first.</td></tr>`;
    return;
  }

  for (const t of tables) {
    const p = existing[t.table_id] || {};
    const tr = document.createElement('tr');
    tr.dataset.tableId = t.table_id;
    tr.innerHTML = `
      <td>${esc(t.table_display_name)}<br><code style="font-size:0.75em;color:var(--m-text-muted)">${esc(t.table_real_name)}</code></td>
      ${['select', 'insert', 'update', 'delete'].map(op => `
        <td style="text-align:center">
          <input type="checkbox" class="form-checkbox perm-cb" data-op="${op}"${p[`${op}_access`] ? ' checked' : ''}>
        </td>
      `).join('')}
    `;
    tbody.appendChild(tr);
  }

  root.querySelector('#btn-save').addEventListener('click', async () => {
    const perms = [...tbody.querySelectorAll('tr[data-table-id]')].map(tr => ({
      tableId: parseInt(tr.dataset.tableId, 10),
      selectAccess: tr.querySelector('[data-op="select"]').checked ? 1 : 0,
      insertAccess: tr.querySelector('[data-op="insert"]').checked ? 1 : 0,
      updateAccess: tr.querySelector('[data-op="update"]').checked ? 1 : 0,
      deleteAccess: tr.querySelector('[data-op="delete"]').checked ? 1 : 0,
    }));

    const res = await api.put(`/admin/groups/${groupId}/permissions`, perms);
    if (res.status === 'ok') {
      flash(root.querySelector('#flash-area'), 'Permissions saved.', 'success');
    } else {
      flash(root.querySelector('#flash-area'), res.message);
    }
  });
}

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
