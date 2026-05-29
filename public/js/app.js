import { api } from './api.js';

const app = document.getElementById('app');

const routes = {
  'login': () => import('./pages/login.js'),
  // Phases 2-4 will register more routes here
};

async function navigate() {
  const hash = window.location.hash.replace('#/', '') || '';
  const [route, ...params] = hash.split('/');

  const loader = routes[route];
  if (loader) {
    const mod = await loader();
    mod.render(app, params);
    return;
  }

  // Default: check session, go to menu or login
  const res = await api.get('/auth/me');
  if (res.status === 'ok') {
    window.location.hash = '#/menu';
  } else {
    window.location.hash = '#/login';
  }
}

window.addEventListener('hashchange', navigate);
window.addEventListener('DOMContentLoaded', navigate);
