import { t } from '../lib/i18n.js';

export function renderField(field, value = null, { readOnly = false, fkOptions = null } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'form-group';

  const label = document.createElement('label');
  label.className = 'form-label';
  label.textContent = fieldLabel(field.name);
  label.htmlFor = `field-${field.name}`;
  wrap.appendChild(label);

  if (readOnly || field.autoIncrement) {
    const span = document.createElement('span');
    span.className = 'field-value';
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
  if (fkOptions) {
    return makeSelect(fkOptions.map(o => ({ value: o.value, label: o.label })), value);
  }

  if (field.type === 'enum' || field.type === 'set') {
    return makeSelect(field.values.map(v => ({ value: v, label: v })), value);
  }

  if (field.type === 'text' || field.type === 'mediumtext' || field.type === 'longtext') {
    const ta = document.createElement('textarea');
    ta.className = 'form-textarea';
    ta.value = value ?? '';
    return ta;
  }

  if (field.type === 'tinyint' && field.length === 1) {
    const row = document.createElement('div');
    row.className = 'form-checkbox-row';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'form-checkbox';
    cb.checked = Boolean(value);
    cb.value = '1';
    row.appendChild(cb);
    return row;
  }

  if (field.type === 'date') {
    const inp = document.createElement('input');
    inp.type = 'date';
    inp.className = 'form-input';
    inp.value = value ?? '';
    return inp;
  }

  if (field.type === 'datetime' || field.type === 'timestamp') {
    const inp = document.createElement('input');
    inp.type = 'datetime-local';
    inp.className = 'form-input';
    inp.value = value ? value.replace(' ', 'T') : '';
    return inp;
  }

  if (field.type === 'int' || field.type === 'integer' || field.type === 'smallint' || field.type === 'bigint') {
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.step = '1';
    inp.className = 'form-input';
    inp.value = value ?? '';
    return inp;
  }

  if (field.type === 'float' || field.type === 'decimal') {
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.step = 'any';
    inp.className = 'form-input';
    inp.value = value ?? '';
    return inp;
  }

  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'form-input';
  inp.value = value ?? '';
  if (field.length) inp.maxLength = field.length;
  return inp;
}

function makeSelect(options, current) {
  const sel = document.createElement('select');
  sel.className = 'form-select';
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = t('common.select');
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
