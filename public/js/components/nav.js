import { api } from '../api.js';

let _user = null;

export async function getUser() {
  if (_user) return _user;
  const res = await api.get('/auth/me');
  if (res.status === 'ok') _user = res.data;
  return _user;
}

export function clearUser() {
  _user = null;
}

export function renderNav(root, { title = 'Mystery', activePath = '' } = {}) {
  const existing = document.getElementById('mystery-nav');
  if (existing) existing.remove();

  const nav = document.createElement('nav');
  nav.id = 'mystery-nav';
  nav.className = 'bg-gray-800 text-white px-4 py-2 flex items-center justify-between mb-4';
  nav.innerHTML = `
    <div class="flex items-center gap-4">
      <a href="#/" class="font-bold text-lg hover:text-blue-300">Mystery</a>
      ${title !== 'Mystery' ? `<span class="text-gray-400">/</span><span class="text-gray-200">${title}</span>` : ''}
    </div>
    <div class="flex items-center gap-4 text-sm">
      ${_user?.isAdmin ? `<a href="#/admin/tables" class="hover:text-blue-300 ${activePath === 'admin' ? 'text-blue-300' : ''}">Admin</a>` : ''}
      <span class="text-gray-400">${_user?.username ?? ''}</span>
      <button id="nav-logout" class="hover:text-red-300">Sign out</button>
    </div>
  `;

  root.parentElement.insertBefore(nav, root);

  nav.querySelector('#nav-logout')?.addEventListener('click', async () => {
    await api.post('/auth/logout');
    clearUser();
    window.location.hash = '#/login';
  });
}
