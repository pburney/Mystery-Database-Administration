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
  } else if (params[0]) {
    await renderForm(root, parseInt(params[0], 10));
  } else {
    await renderList(root);
  }
}

async function renderList(root) {
  renderNav(root, { title: 'Admin: Users', activePath: 'admin' });
  root.innerHTML = '';
  renderAdminNav(root, 'users');
  root.insertAdjacentHTML('beforeend', `
    <div class="page-wrap">
      <div id="flash-area"></div>
      <div class="page-header">
        <h2 class="page-title">Users</h2>
        <a href="#/admin/users/new" class="btn btn-primary">+ Add User</a>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Name</th>
              <th>Active?</th>
              <th>Groups</th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
    </div>
  `);

  const [usersRes, groupsRes] = await Promise.all([
    api.get('/admin/users'),
    api.get('/admin/groups'),
  ]);

  if (usersRes.status !== 'ok') {
    flash(root.querySelector('#flash-area'), usersRes.message);
    return;
  }

  const groupMap = Object.fromEntries((groupsRes.data || []).map(g => [String(g.group_id), g.group_name]));

  const tbody = root.querySelector('#tbody');
  if (!usersRes.data.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No users found.</td></tr>`;
    return;
  }

  for (const u of usersRes.data) {
    const groupNames = u.group_ids
      ? u.group_ids.split(',').map(id => groupMap[id] || `Group ${id}`).join(', ')
      : '—';
    const isPrimary = u.user_id === 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${esc(u.user_username)}</strong>${isPrimary ? ' <span class="text-muted" style="font-size:0.75em">(primary admin)</span>' : ''}</td>
      <td>${esc(u.user_email)}</td>
      <td>${esc([u.user_first_name, u.user_last_name].filter(Boolean).join(' ')) || '<span class="text-muted">—</span>'}</td>
      <td>${u.is_active ? '✓' : '<span class="text-muted">—</span>'}</td>
      <td><span class="text-muted" style="font-size:0.875em">${esc(groupNames)}</span></td>
      <td class="col-actions">
        <a href="#/admin/users/${u.user_id}" class="action-edit">Edit</a>
        <button class="action-delete" data-id="${u.user_id}" data-name="${esc(u.user_username)}"${isPrimary ? ' disabled title="Cannot delete primary admin"' : ''}>Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  tbody.addEventListener('click', async e => {
    const btn = e.target.closest('button[data-id]:not([disabled])');
    if (!btn) return;
    const { id, name } = btn.dataset;
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    const del = await api.del(`/admin/users/${id}`);
    if (del.status === 'ok') {
      btn.closest('tr').remove();
      flash(root.querySelector('#flash-area'), `User "${name}" deleted.`, 'success');
    } else {
      flash(root.querySelector('#flash-area'), del.message);
    }
  });
}

async function renderForm(root, userId) {
  const isEdit = userId !== null;
  renderNav(root, { title: 'Admin: Users', crumbHref: '#/admin/users', activePath: 'admin' });
  root.innerHTML = '';
  renderAdminNav(root, 'users');
  root.insertAdjacentHTML('beforeend', `
    <div class="page-wrap-sm">
      <div id="flash-area"></div>
      <div class="page-header">
        <h2 id="form-title" class="page-title">${isEdit ? 'Edit User' : 'Add User'}</h2>
        <a href="#/admin/users" class="back-link">← Back to Users</a>
      </div>
      <div class="page-card">
        <form id="user-form">
          <fieldset class="admin-fieldset">
            <legend class="admin-legend">Account</legend>
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label" for="f-username">Username <span class="text-danger">*</span></label>
                <input id="f-username" name="user_username" class="form-input" required${isEdit ? ' readonly style="opacity:0.6"' : ''} placeholder="jsmith">
              </div>
              <div class="form-group">
                <label class="form-label" for="f-email">Email <span class="text-danger">*</span></label>
                <input id="f-email" name="user_email" type="email" class="form-input" required placeholder="jsmith@example.com">
              </div>
            </div>
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label" for="f-fname">First Name</label>
                <input id="f-fname" name="user_first_name" class="form-input" placeholder="Jane">
              </div>
              <div class="form-group">
                <label class="form-label" for="f-lname">Last Name</label>
                <input id="f-lname" name="user_last_name" class="form-input" placeholder="Smith">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="f-password">Password${isEdit ? '' : ' <span class="text-danger">*</span>'}</label>
              <input id="f-password" name="user_password" type="password" class="form-input"${isEdit ? '' : ' required'} placeholder="${isEdit ? 'Leave blank to keep current password' : 'Set a strong password'}">
              ${isEdit ? '<span class="form-hint">Leave blank to keep the existing password.</span>' : ''}
            </div>
            ${isEdit ? `
            <div class="form-group">
              <label class="form-label form-checkbox-label">
                <input type="checkbox" name="is_active" value="1" class="form-checkbox" checked>
                Account active
              </label>
            </div>` : ''}
          </fieldset>

          <fieldset class="admin-fieldset">
            <legend class="admin-legend">Groups</legend>
            <div id="groups-area" class="form-hint" style="margin:0">Loading groups…</div>
          </fieldset>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">${isEdit ? 'Save changes' : 'Create user'}</button>
            <a href="#/admin/users" class="btn btn-secondary">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  `);

  const groupsRes = await api.get('/admin/groups');
  const groups = groupsRes.status === 'ok' ? groupsRes.data : [];
  const groupsArea = root.querySelector('#groups-area');

  let currentGroupIds = [];

  if (isEdit) {
    const userRes = await api.get('/admin/users');
    const userData = (userRes.data || []).find(u => u.user_id === userId);
    if (!userData) {
      flash(root.querySelector('#flash-area'), 'User not found.');
      return;
    }
    currentGroupIds = userData.group_ids ? userData.group_ids.split(',').map(Number) : [];
    root.querySelector('#form-title').textContent = `Edit: ${userData.user_username}`;
    root.querySelector('[name="user_username"]').value = userData.user_username;
    root.querySelector('[name="user_email"]').value = userData.user_email;
    root.querySelector('[name="user_first_name"]').value = userData.user_first_name || '';
    root.querySelector('[name="user_last_name"]').value = userData.user_last_name || '';
    root.querySelector('[name="is_active"]').checked = Boolean(userData.is_active);
  }

  if (!groups.length) {
    groupsArea.textContent = 'No groups configured yet.';
  } else {
    groupsArea.innerHTML = '';
    for (const g of groups) {
      const label = document.createElement('label');
      label.className = 'form-checkbox-label';
      label.style.marginBottom = '0.4rem';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.name = 'group_ids';
      cb.value = g.group_id;
      cb.className = 'form-checkbox';
      cb.checked = currentGroupIds.includes(g.group_id);
      label.appendChild(cb);
      label.appendChild(document.createTextNode(` ${g.group_name}${g.group_desc ? ` — ${g.group_desc}` : ''}`));
      groupsArea.appendChild(label);
      groupsArea.insertAdjacentHTML('beforeend', '<br>');
    }
  }

  root.querySelector('#user-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const data = {
      user_username: form.elements.user_username?.value || undefined,
      user_email: form.elements.user_email.value,
      user_first_name: form.elements.user_first_name.value || '',
      user_last_name: form.elements.user_last_name.value || '',
      group_ids: [...form.querySelectorAll('[name="group_ids"]:checked')].map(cb => parseInt(cb.value, 10)),
    };
    const pw = form.elements.user_password.value;
    if (pw) data.user_password = pw;
    if (isEdit) {
      const isActiveEl = form.elements.is_active;
      if (isActiveEl) data.is_active = isActiveEl.checked ? 1 : 0;
    }

    const res = isEdit
      ? await api.put(`/admin/users/${userId}`, data)
      : await api.post('/admin/users', data);

    if (res.status === 'ok') {
      window.location.hash = '#/admin/users';
    } else {
      flash(root.querySelector('#flash-area'), res.message);
    }
  });
}

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
