import { api } from './api.js';
import { loadBranding, getBranding } from './lib/branding.js';
import { applyLocale } from './lib/i18n.js';

// Apply saved theme immediately (before first render) to avoid flash
document.documentElement.dataset.theme = localStorage.getItem('mystery-theme') || 'plum';

// Apply saved locale immediately (before first render) to avoid flash
applyLocale();

const app = document.getElementById('app');

// Route handlers — each returns a {render} module
const routes = {
  'login':  () => import('./pages/login.js'),
  'menu':   () => import('./pages/menu.js'),
  'list':   () => import('./pages/list.js'),
  'view':   () => import('./pages/view.js'),
  'add':    () => import('./pages/form.js'),
  'edit':   () => import('./pages/form.js'),
  'delete': () => import('./pages/delete.js'),
  'plugin': () => import('./pages/plugin.js'),
};

async function navigate() {
  // Resolve branding once before any page renders, so nav.js's synchronous
  // getBranding() reads never see the placeholder defaults, then reflect it
  // in the tab title (there's no server templating to set <title> per-app).
  await loadBranding();
  document.title = getBranding().appName;

  const hash = window.location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/');
  const route = parts[0] || '';
  const params = parts.slice(1);

  if (route === 'add' || route === 'edit') {
    // form.js needs to know the mode
    const mod = await routes[route]();
    mod.render(app, [route, ...params]);
    return;
  }

  if (route === 'admin') {
    const section = params[0];
    if (section === 'tables') {
      const mod = await import('./pages/admin/tables.js');
      mod.render(app, params.slice(1));
      return;
    }
    if (section === 'users') {
      const mod = await import('./pages/admin/users.js');
      mod.render(app, params.slice(1));
      return;
    }
    if (section === 'groups') {
      const mod = await import('./pages/admin/groups.js');
      mod.render(app, params.slice(1));
      return;
    }
    window.location.hash = '#/admin/tables';
    return;
  }

  const loader = routes[route];
  if (loader) {
    const mod = await loader();
    mod.render(app, params);
    return;
  }

  // Default: check session
  const res = await api.get('/auth/me');
  if (res.status === 'ok') {
    window.location.hash = '#/menu';
  } else {
    window.location.hash = '#/login';
  }
}

window.addEventListener('hashchange', navigate);
window.addEventListener('DOMContentLoaded', navigate);
