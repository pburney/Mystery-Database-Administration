import { api } from '../api.js';

export function render(root) {
  root.innerHTML = `
    <div class="min-h-screen flex items-center justify-center">
      <div class="bg-white shadow-md rounded-lg p-8 w-full max-w-sm">
        <h1 class="text-2xl font-bold mb-1 text-center">Mystery</h1>
        <p class="text-sm text-gray-500 text-center mb-6">Database Admin Interface</p>
        <div id="flash" class="hidden mb-4 px-3 py-2 rounded text-sm"></div>
        <form id="login-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1" for="username">Username</label>
            <input id="username" name="username" type="text" autocomplete="username"
              class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin" required>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1" for="password">Password</label>
            <input id="password" name="password" type="password" autocomplete="current-password"
              class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required>
          </div>
          <button type="submit"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded transition">
            Sign in
          </button>
        </form>
      </div>
    </div>
  `;

  const form = root.querySelector('#login-form');
  const flash = root.querySelector('#flash');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    flash.className = 'hidden mb-4 px-3 py-2 rounded text-sm';

    const username = form.username.value.trim();
    const password = form.password.value;

    const res = await api.post('/auth/login', { username, password });
    if (res.status === 'ok') {
      window.location.hash = '#/menu';
    } else {
      flash.textContent = res.message || 'Login failed';
      flash.className = 'mb-4 px-3 py-2 rounded text-sm bg-red-100 text-red-700';
    }
  });
}
