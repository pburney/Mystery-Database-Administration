import { api } from '../api.js';

export async function render(root) {
  const brandRes = await api.get('/auth/branding');
  const { logoUrl, appName, subtitle } = brandRes.status === 'ok'
    ? brandRes.data
    : { logoUrl: '/images/mystery-logo.png', appName: 'Mystery', subtitle: 'Database Admin Interface' };

  root.innerHTML = `
    <div class="login-wrap">
      <div class="login-card">
        <img class="login-logo" src="${logoUrl}" alt="${appName} logo">
        <h1 class="login-title">${appName}</h1>
        <p class="login-subtitle">${subtitle}</p>
        <div id="flash"></div>
        <form id="login-form">
          <div class="form-group">
            <label class="form-label" for="username">Username</label>
            <input id="username" name="username" type="text" autocomplete="username"
              class="form-input" placeholder="admin" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <input id="password" name="password" type="password" autocomplete="current-password"
              class="form-input" required>
          </div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top:0.5rem">
            Sign in
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
      flashEl.textContent = res.message || 'Login failed';
    }
  });
}
