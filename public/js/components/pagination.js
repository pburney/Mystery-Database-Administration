export function renderPagination(container, { page, rows, total, onPage }) {
  const totalPages = Math.max(1, Math.ceil(total / rows));
  container.innerHTML = '';
  if (totalPages <= 1) return;

  const make = (label, p, disabled = false) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.disabled = disabled;
    btn.className = `px-2 py-1 text-sm border rounded ${disabled ? 'text-gray-400 cursor-default' : 'hover:bg-gray-100'}`;
    if (!disabled) btn.addEventListener('click', () => onPage(p));
    return btn;
  };

  container.appendChild(make('«', 1, page <= 1));
  container.appendChild(make('‹', page - 1, page <= 1));

  const span = document.createElement('span');
  span.className = 'px-2 py-1 text-sm text-gray-600';
  span.textContent = `Page ${page} of ${totalPages} (${total} total)`;
  container.appendChild(span);

  container.appendChild(make('›', page + 1, page >= totalPages));
  container.appendChild(make('»', totalPages, page >= totalPages));
}
