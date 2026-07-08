import { api } from '../api.js';
import { getBranding } from '../lib/branding.js';
import { LOCALES, getLocale, setLocale, t } from '../lib/i18n.js';

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

let _outsideClickBound = false;

function bindOutsideClickOnce() {
  if (_outsideClickBound) return;
  _outsideClickBound = true;
  document.addEventListener('click', e => {
    document.querySelectorAll('#mystery-nav .nav-dropdown.open').forEach(dd => {
      if (!dd.contains(e.target)) dd.classList.remove('open');
    });
  });
}

function toggleDropdown(btn) {
  const dd = btn.closest('.nav-dropdown');
  const nav = dd.closest('.mystery-nav');
  const wasOpen = dd.classList.contains('open');
  nav.querySelectorAll('.nav-dropdown.open').forEach(d => d.classList.remove('open'));
  if (!wasOpen) dd.classList.add('open');
}

function applyTheme(name) {
  document.documentElement.dataset.theme = name;
  localStorage.setItem('mystery-theme', name);
}

export function renderNav(root, { title = '', crumbHref = '', activePath = '' } = {}) {
  const existing = document.getElementById('mystery-nav');
  if (existing) existing.remove();

  const current = localStorage.getItem('mystery-theme') || 'plum';
  const { appName, logoUrl } = getBranding();
  const currentLocale = getLocale();
  const currentLocaleInfo = LOCALES.find(l => l.code === currentLocale) ?? LOCALES[0];

  const themeOptions = THEMES.map(th =>
    `<button class="nav-dropdown-option${th === current ? ' active' : ''}" data-t="${th}">
      <span class="theme-swatch" data-t="${th}"></span>${th[0].toUpperCase() + th.slice(1)}
    </button>`
  ).join('');

  const localeOptions = LOCALES.map(l =>
    `<button class="nav-dropdown-option${l.code === currentLocale ? ' active' : ''}" data-locale="${l.code}">${l.flag} ${l.label}</button>`
  ).join('');

  const nav = document.createElement('nav');
  nav.id = 'mystery-nav';
  nav.className = 'mystery-nav';
  nav.innerHTML = `
    <div class="nav-left">
      <a href="#/" class="nav-brand">${logoUrl ? `<img class="nav-logo" src="${logoUrl}" alt="">` : ''}${appName}</a>
      ${title ? `<span class="nav-sep">/</span>${crumbHref ? `<a href="${crumbHref}" class="nav-crumb nav-crumb-link">${title}</a>` : `<span class="nav-crumb">${title}</span>`}` : ''}
    </div>
    <div class="nav-right">
      <div class="nav-dropdown locale-picker">
        <button class="nav-dropdown-toggle locale-flag-toggle" title="${currentLocaleInfo.label}" aria-label="${t('nav.language')}">${currentLocaleInfo.flag}</button>
        <div class="nav-dropdown-menu">${localeOptions}</div>
      </div>
      <div class="nav-dropdown theme-picker">
        <button class="nav-dropdown-toggle theme-swatch theme-swatch-toggle" data-t="${current}" aria-label="${t('nav.theme')}"></button>
        <div class="nav-dropdown-menu">${themeOptions}</div>
      </div>
      ${_user?.isAdmin ? `<a href="#/admin/tables" class="nav-link${activePath === 'admin' ? ' active' : ''}">${t('nav.admin')}</a>` : ''}
      ${_user?.username ? `<span class="nav-username">${_user.username}</span>` : ''}
      <button id="nav-logout" class="nav-logout">${t('nav.signOut')}</button>
    </div>
  `;

  root.parentElement.insertBefore(nav, root);
  bindOutsideClickOnce();

  nav.querySelectorAll('.nav-dropdown-toggle').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleDropdown(btn);
    });
  });

  nav.querySelectorAll('.theme-picker .nav-dropdown-option').forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.t);
      nav.querySelector('.theme-picker .nav-dropdown-toggle').dataset.t = btn.dataset.t;
      nav.querySelectorAll('.theme-picker .nav-dropdown-option').forEach(o => o.classList.toggle('active', o === btn));
      nav.querySelector('.theme-picker').classList.remove('open');
    });
  });

  nav.querySelectorAll('.locale-picker .nav-dropdown-option').forEach(btn => {
    btn.addEventListener('click', () => {
      setLocale(btn.dataset.locale);
      window.location.reload();
    });
  });

  nav.querySelector('#nav-logout')?.addEventListener('click', async () => {
    await api.post('/auth/logout');
    clearUser();
    window.location.hash = '#/login';
  });
}
