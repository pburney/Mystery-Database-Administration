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
    const mod = await import(`/plugins/${pluginKey}/${pluginKey}.js`);
    if (typeof mod.render !== 'function') {
      throw new Error(`Plugin "${pluginKey}" has no render() export`);
    }
    await mod.render(root, params);
  } catch (err) {
    flash(root.querySelector('.page-wrap') ?? root, `Couldn't load plugin "${pluginKey}": ${err.message}`);
  }
}
