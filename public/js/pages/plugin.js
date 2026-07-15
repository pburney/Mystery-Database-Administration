import { renderNav, getUser } from '../components/nav.js';
import { flash } from '../components/flash.js';

export async function render(root, [pluginKey, ...params] = []) {
  const user = await getUser();
  if (!user) {
    window.location.hash = '#/login';
    return;
  }
  renderNav(root, { title: '' });

  root.innerHTML = `<div class="page-wrap"><div id="flash-area"></div></div>`;

  if (!pluginKey) {
    window.location.hash = '#/menu';
    return;
  }

  try {
    // Absolute path specifiers always resolve from the origin root,
    // ignoring any <base href> — same reason api.js reads <base> manually
    // rather than hardcoding "/api". Without this, plugins 404 under a
    // subpath deployment (BASE_PATH set) even though the rest of the shell
    // loaded fine via relative script/link tags in index.html.
    const basePath = document.querySelector('base')?.getAttribute('href')?.replace(/\/$/, '') ?? '';
    const mod = await import(`${basePath}/plugins/${pluginKey}/${pluginKey}.js`);
    if (typeof mod.render !== 'function') {
      throw new Error(`Plugin "${pluginKey}" has no render() export`);
    }
    await mod.render(root, params);
  } catch (err) {
    flash(root.querySelector('.page-wrap') ?? root, `Couldn't load plugin "${pluginKey}": ${err.message}`);
  }
}
