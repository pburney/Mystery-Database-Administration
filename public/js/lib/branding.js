import { api } from '../api.js';

let _branding = {
  appName: 'Mystery',
  subtitle: 'Database Admin Interface',
  logoUrl: '/images/mystery-logo.png',
};
let _loaded = false;

// Resolves the real branding once, then caches it — call this at boot,
// before anything renders synchronously off getBranding().
export async function loadBranding() {
  if (_loaded) return _branding;
  const res = await api.get('/auth/branding');
  if (res.status === 'ok') _branding = res.data;
  _loaded = true;
  return _branding;
}

// Synchronous read of whatever's cached (defaults until loadBranding() resolves).
export function getBranding() {
  return _branding;
}
