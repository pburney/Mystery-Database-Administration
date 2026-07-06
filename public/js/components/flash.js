export function flash(root, message, type = 'error') {
  let el = root.querySelector('#flash');
  if (!el) {
    el = document.createElement('div');
    el.id = 'flash';
    root.prepend(el);
  }
  const typeClass = { error: 'flash-error', warning: 'flash-warning', info: 'flash-info', success: 'flash-success' };
  el.className = `flash ${typeClass[type] ?? 'flash-info'}`;
  el.textContent = message;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export function clearFlash(root) {
  const el = root.querySelector('#flash');
  if (el) el.remove();
}
