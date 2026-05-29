/**
 * Renders a form input for a given field.
 * @param {Object} field - FieldMeta from /api/schema
 * @param {*} value - current value (null for add, existing for edit)
 * @param {Object} [opts]
 * @param {boolean} [opts.readOnly]
 * @param {Object[]} [opts.fkOptions] - [{value, label}] for FK select fields
 * @returns {HTMLElement}
 */
export function renderField(field, value = null, { readOnly = false, fkOptions = null } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-col gap-1';

  const label = document.createElement('label');
  label.className = 'text-sm font-medium';
  label.textContent = fieldLabel(field.name);
  label.htmlFor = `field-${field.name}`;
  wrap.appendChild(label);

  if (readOnly || field.autoIncrement) {
    const span = document.createElement('span');
    span.className = 'text-sm text-gray-700 py-1';
    span.textContent = value ?? '';
    wrap.appendChild(span);
    return wrap;
  }

  const input = buildInput(field, value, fkOptions);
  input.id = `field-${field.name}`;
  input.name = field.name;
  wrap.appendChild(input);
  return wrap;
}

function buildInput(field, value, fkOptions) {
  const base = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (fkOptions) {
    return makeSelect(fkOptions.map(o => ({ value: o.value, label: o.label })), value, base);
  }

  if (field.type === 'enum' || field.type === 'set') {
    return makeSelect(field.values.map(v => ({ value: v, label: v })), value, base);
  }

  if (field.type === 'text' || field.type === 'mediumtext' || field.type === 'longtext') {
    const ta = document.createElement('textarea');
    ta.className = base + ' min-h-[80px]';
    ta.value = value ?? '';
    return ta;
  }

  if (field.type === 'tinyint' && field.length === 1) {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'h-4 w-4';
    cb.checked = Boolean(value);
    cb.value = '1';
    return cb;
  }

  if (field.type === 'date') {
    const inp = document.createElement('input');
    inp.type = 'date';
    inp.className = base;
    inp.value = value ?? '';
    return inp;
  }

  if (field.type === 'datetime' || field.type === 'timestamp') {
    const inp = document.createElement('input');
    inp.type = 'datetime-local';
    inp.className = base;
    inp.value = value ? value.replace(' ', 'T') : '';
    return inp;
  }

  if (field.type === 'int' || field.type === 'integer' || field.type === 'smallint'
      || field.type === 'bigint' || field.type === 'float' || field.type === 'decimal') {
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.className = base;
    inp.value = value ?? '';
    return inp;
  }

  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = base;
  inp.value = value ?? '';
  if (field.length) inp.maxLength = field.length;
  return inp;
}

function makeSelect(options, current, cls) {
  const sel = document.createElement('select');
  sel.className = cls;
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = '— select —';
  sel.appendChild(blank);
  for (const { value, label } of options) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    if (String(value) === String(current)) opt.selected = true;
    sel.appendChild(opt);
  }
  return sel;
}

export function fieldLabel(name) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function collectFormData(form, fields) {
  const data = {};
  for (const field of fields) {
    if (field.autoIncrement) continue;
    const el = form.elements[field.name];
    if (!el) continue;
    if (el.type === 'checkbox') {
      data[field.name] = el.checked ? 1 : 0;
    } else {
      data[field.name] = el.value === '' ? null : el.value;
    }
  }
  return data;
}
