export function flash(root, message, type = 'error') {
  let el = root.querySelector('#flash');
  if (!el) {
    el = document.createElement('div');
    el.id = 'flash';
    root.prepend(el);
  }
  const colors = {
    error:   'bg-red-100 text-red-700 border border-red-300',
    warning: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
    info:    'bg-blue-100 text-blue-700 border border-blue-300',
    success: 'bg-green-100 text-green-700 border border-green-300',
  };
  el.className = `mb-4 px-3 py-2 rounded text-sm ${colors[type] ?? colors.info}`;
  el.textContent = message;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export function clearFlash(root) {
  const el = root.querySelector('#flash');
  if (el) el.remove();
}
