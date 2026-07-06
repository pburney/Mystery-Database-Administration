const TABS = [
  { key: 'tables', label: 'Tables', href: '#/admin/tables' },
  { key: 'users',  label: 'Users',  href: '#/admin/users' },
  { key: 'groups', label: 'Groups', href: '#/admin/groups' },
];

export function renderAdminNav(root, active) {
  const existing = root.querySelector('.admin-subnav');
  if (existing) existing.remove();

  const nav = document.createElement('nav');
  nav.className = 'admin-subnav';
  nav.innerHTML = TABS.map(t =>
    `<a href="${t.href}" class="admin-subnav-tab${t.key === active ? ' active' : ''}">${t.label}</a>`
  ).join('');

  const content = root.querySelector('.page-wrap, .page-wrap-sm, .page-wrap-xs');
  if (content) {
    root.insertBefore(nav, content);
  } else {
    root.appendChild(nav);
  }
}
