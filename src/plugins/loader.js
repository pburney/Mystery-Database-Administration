import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadPlugins(app, configDb) {
  const plugins = configDb.prepare(`SELECT * FROM plugins WHERE is_active = 1`).all();

  for (const plugin of plugins) {
    const pluginDir = resolve(__dirname, plugin.plugin_key);
    const indexFile = resolve(pluginDir, 'index.js');

    if (!existsSync(indexFile)) {
      console.warn(`Plugin "${plugin.plugin_key}" has no index.js at ${indexFile} — skipping`);
      continue;
    }

    try {
      const mod = await import(indexFile);
      const router = mod.default;
      if (!router) throw new Error('index.js must export a Router as default');
      app.use(`/api/plugins/${plugin.plugin_key}`, router);

      // Serve plugin public assets if present
      const publicDir = resolve(pluginDir, 'public');
      if (existsSync(publicDir)) {
        const { default: express } = await import('express');
        app.use(`/plugins/${plugin.plugin_key}`, express.static(publicDir));
      }

      console.log(`Plugin loaded: ${plugin.plugin_key}`);
    } catch (err) {
      console.error(`Failed to load plugin "${plugin.plugin_key}":`, err.message);
    }
  }
}
