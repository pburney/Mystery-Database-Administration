import { api } from './api.js';

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
  // Admin pages added in Phase 4
};

async function navigate() {
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
