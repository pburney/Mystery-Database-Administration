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

const THEMES = ['plum', 'slate', 'ocean'];

function applyTheme(name) {
  document.documentElement.dataset.theme = name;
  localStorage.setItem('mystery-theme', name);
  document.querySelectorAll('.theme-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.t === name);
  });
}

export function renderNav(root, { title = '', crumbHref = '', activePath = '' } = {}) {
  const existing = document.getElementById('mystery-nav');
  if (existing) existing.remove();

  const current = localStorage.getItem('mystery-theme') || 'plum';

  const swatches = THEMES.map(t =>
    `<button class="theme-swatch${t === current ? ' active' : ''}" data-t="${t}" title="${t[0].toUpperCase() + t.slice(1)} theme" aria-label="${t} theme"></button>`
  ).join('');

  const nav = document.createElement('nav');
  nav.id = 'mystery-nav';
  nav.className = 'mystery-nav';
  nav.innerHTML = `
    <div class="nav-left">
      <a href="#/" class="nav-brand">Mystery</a>
      ${title ? `<span class="nav-sep">/</span>${crumbHref ? `<a href="${crumbHref}" class="nav-crumb nav-crumb-link">${title}</a>` : `<span class="nav-crumb">${title}</span>`}` : ''}
    </div>
    <div class="nav-right">
      <div class="theme-picker">${swatches}</div>
      ${_user?.isAdmin ? `<a href="#/admin/tables" class="nav-link${activePath === 'admin' ? ' active' : ''}">Admin</a>` : ''}
      ${_user?.username ? `<span class="nav-username">${_user.username}</span>` : ''}
      <button id="nav-logout" class="nav-logout">Sign out</button>
    </div>
  `;

  root.parentElement.insertBefore(nav, root);

  nav.querySelectorAll('.theme-swatch').forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.t));
  });

  nav.querySelector('#nav-logout')?.addEventListener('click', async () => {
    await api.post('/auth/logout');
    clearUser();
    window.location.hash = '#/login';
  });
}
