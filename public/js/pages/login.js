import { api } from '../api.js';
import { loadBranding } from '../lib/branding.js';
import { t } from '../lib/i18n.js';

export async function render(root) {
  const { logoUrl, appName, subtitle } = await loadBranding();

  root.innerHTML = `
    <div class="login-wrap">
      <div class="login-card">
        <img class="login-logo" src="${logoUrl}" alt="${appName} logo">
        <h1 class="login-title">${appName}</h1>
        <p class="login-subtitle">${subtitle}</p>
        <div id="flash"></div>
        <form id="login-form">
          <div class="form-group">
            <label class="form-label" for="username">${t('login.username')}</label>
            <input id="username" name="username" type="text" autocomplete="username"
              class="form-input" placeholder="admin" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="password">${t('login.password')}</label>
            <input id="password" name="password" type="password" autocomplete="current-password"
              class="form-input" required>
          </div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top:0.5rem">
            ${t('login.signIn')}
          </button>
        </form>
      </div>
    </div>
  `;

  const form = root.querySelector('#login-form');
  const flashEl = root.querySelector('#flash');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    flashEl.className = '';
    flashEl.textContent = '';

    const username = form.username.value.trim();
    const password = form.password.value;

    const res = await api.post('/auth/login', { username, password });
    if (res.status === 'ok') {
      window.location.hash = '#/menu';
    } else {
      flashEl.className = 'flash flash-error';
      flashEl.textContent = res.message || t('login.failed');
    }
  });
}
