import en from '../locales/en.js';
import es from '../locales/es.js';
import pt from '../locales/pt.js';
import ht from '../locales/ht.js';
import fr from '../locales/fr.js';

const STORAGE_KEY = 'mystery-locale';

export const LOCALES = [
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'es', flag: '🇲🇽', label: 'Español' },
  { code: 'pt', flag: '🇧🇷', label: 'Português' },
  { code: 'ht', flag: '🇭🇹', label: 'Kreyòl' },
  { code: 'fr', flag: '🇨🇦', label: 'Français' },
];

const TABLES = { en, es, pt, ht, fr };

let _locale = null;

export function getLocale() {
  if (_locale) return _locale;
  const stored = localStorage.getItem(STORAGE_KEY);
  _locale = LOCALES.some(l => l.code === stored) ? stored : 'en';
  return _locale;
}

export function setLocale(code) {
  _locale = code;
  localStorage.setItem(STORAGE_KEY, code);
  document.documentElement.lang = code;
}

// Sets <html lang> from the persisted choice — call once at boot, before render.
export function applyLocale() {
  document.documentElement.lang = getLocale();
}

function lookup(table, key) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), table);
}

export function t(key, vars) {
  const table = TABLES[getLocale()] || en;
  let str = lookup(table, key) ?? lookup(en, key) ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, v);
    }
  }
  return str;
}
