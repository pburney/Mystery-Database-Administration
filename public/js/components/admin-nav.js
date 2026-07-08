import { t } from '../lib/i18n.js';

const TABS = [
  { key: 'tables', labelKey: 'adminNav.tables', href: '#/admin/tables' },
  { key: 'users',  labelKey: 'adminNav.users',  href: '#/admin/users' },
  { key: 'groups', labelKey: 'adminNav.groups', href: '#/admin/groups' },
];

export function renderAdminNav(root, active) {
  const existing = root.querySelector('.admin-subnav');
  if (existing) existing.remove();

  const nav = document.createElement('nav');
  nav.className = 'admin-subnav';
  nav.innerHTML = TABS.map(tab =>
    `<a href="${tab.href}" class="admin-subnav-tab${tab.key === active ? ' active' : ''}">${t(tab.labelKey)}</a>`
  ).join('');

  const content = root.querySelector('.page-wrap, .page-wrap-sm, .page-wrap-xs');
  if (content) {
    root.insertBefore(nav, content);
  } else {
    root.appendChild(nav);
  }
}
