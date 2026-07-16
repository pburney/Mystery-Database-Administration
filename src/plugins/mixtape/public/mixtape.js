// Frontend for the mixtape plugin. The SPA (public/js/pages/plugin.js) loads
// this file at #/plugin/mixtape and calls render(root). Imports are relative so
// the plugin works whether Mystery is served from the domain root or a subpath.
import { api } from '../../js/api.js';
import { renderNav } from '../../js/components/nav.js';
import { flash } from '../../js/components/flash.js';
import { msToClock, totalDuration } from './format.js';

const P = '/plugins/mixtape'; // api.js already prefixes <base> + /api

// Session state: which mixtape is open, and the current library search results.
let selectedId = null;
let searchResults = [];

export async function render(root) {
  renderNav(root, { title: 'Mixtape' });

  root.innerHTML = `
    <div class="page-wrap">
      <div id="flash-area"></div>
      <style>
        .mx-layout { display: grid; grid-template-columns: 260px 1fr; gap: 1.25rem; align-items: start; }
        @media (max-width: 640px) { .mx-layout { grid-template-columns: 1fr; } }

        .mx-panel { border: 1px solid var(--m-border); border-radius: 0.5rem; padding: 0.85rem; background: var(--m-row-hover); }
        .mx-panel h3 { margin: 0 0 0.75rem; font-size: 1rem; }

        .mx-list { list-style: none; margin: 0 0 0.75rem; padding: 0; }
        .mx-list li { display: flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0.55rem; margin-bottom: 0.35rem;
          border: 1px solid var(--m-border); border-radius: 0.375rem; background: var(--m-bg, #fff); cursor: pointer; }
        .mx-list li.active { border-color: var(--m-accent); outline: 1px solid var(--m-accent); }
        .mx-list .mx-name { font-weight: 600; flex: 1; }
        .mx-list .mx-meta { font-size: 0.8rem; color: var(--m-link); white-space: nowrap; }
        .mx-empty { font-size: 0.9rem; color: var(--m-link); margin: 0.25rem 0 0.75rem; }

        .mx-new { display: flex; gap: 0.4rem; }
        .mx-new input { flex: 1; box-sizing: border-box; }

        .mx-detail-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: 0.75rem; }
        .mx-detail-head h3 { margin: 0; }
        .mx-total { font-size: 0.85rem; color: var(--m-link); white-space: nowrap; }

        .mx-tracks { list-style: none; margin: 0 0 1.25rem; padding: 0; }
        .mx-tracks li { display: flex; align-items: center; gap: 0.6rem; padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--m-border); font-size: 0.9rem; }
        .mx-tracks .mx-pos { width: 1.5rem; text-align: right; color: var(--m-link); }
        .mx-tracks .mx-track-name { flex: 1; font-weight: 500; }
        .mx-tracks .mx-artist { flex: 1; color: var(--m-link); }
        .mx-tracks .mx-dur { width: 3.5rem; text-align: right; font-variant-numeric: tabular-nums; }

        .mx-remove, .mx-del { border: none; background: none; cursor: pointer; color: #b91c1c; font-size: 1rem; line-height: 1; padding: 0 0.25rem; }
        .mx-remove:hover, .mx-del:hover { color: #7f1d1d; }

        .mx-search input { width: 100%; box-sizing: border-box; margin-bottom: 0.5rem; }
        .mx-results { list-style: none; margin: 0; padding: 0; max-height: 320px; overflow-y: auto; }
        .mx-results li { display: flex; align-items: center; gap: 0.6rem; padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--m-border); font-size: 0.9rem; }
        .mx-results .mx-track-name { flex: 1; font-weight: 500; }
        .mx-results .mx-artist { flex: 1; color: var(--m-link); }
        .mx-results .mx-dur { width: 3.5rem; text-align: right; font-variant-numeric: tabular-nums; }
        .mx-add { padding: 0.2rem 0.6rem; }
        .mx-placeholder { font-size: 0.9rem; color: var(--m-link); padding: 1rem 0; }
      </style>

      <div class="mx-layout">
        <div class="mx-panel mx-sidebar">
          <h3>Mixtapes</h3>
          <ul class="mx-list" id="mx-list"></ul>
          <form class="mx-new" id="mx-new">
            <input id="mx-new-name" type="text" placeholder="New mixtape…" maxlength="120" autocomplete="off" />
            <button type="submit">Add</button>
          </form>
        </div>
        <div class="mx-panel mx-detail" id="mx-detail"></div>
      </div>
    </div>
  `;

  const flashArea = root.querySelector('.page-wrap');
  const listEl = root.querySelector('#mx-list');
  const detailEl = root.querySelector('#mx-detail');

  async function loadList() {
    const res = await api.get(`${P}/mixtapes`);
    if (res.status !== 'ok') return flash(flashArea, res.message || 'Could not load mixtapes');
    const tapes = res.data || [];

    listEl.innerHTML = tapes.length
      ? tapes.map((m) => `
        <li data-id="${m.MixtapeId}" class="${m.MixtapeId === selectedId ? 'active' : ''}">
          <span class="mx-name">${esc(m.Name)}</span>
          <span class="mx-meta">${m.TrackCount} · ${msToClock(m.TotalMs)}</span>
          <button class="mx-del" title="Delete mixtape" data-del="${m.MixtapeId}">✕</button>
        </li>`).join('')
      : `<li class="mx-empty">No mixtapes yet.</li>`;

    if (selectedId && !tapes.some((m) => m.MixtapeId === selectedId)) selectedId = null;
    if (selectedId) loadDetail(selectedId);
    else renderPlaceholder();
  }

  function renderPlaceholder() {
    detailEl.innerHTML = `<p class="mx-placeholder">Pick a mixtape on the left, or create one to get started.</p>`;
  }

  async function loadDetail(id) {
    selectedId = id;
    listEl.querySelectorAll('li').forEach((li) => li.classList.toggle('active', Number(li.dataset.id) === id));

    const res = await api.get(`${P}/mixtapes/${id}`);
    if (res.status !== 'ok') return flash(flashArea, res.message || 'Could not load mixtape');
    const { Name, tracks } = res.data;
    const total = totalDuration(tracks);

    detailEl.innerHTML = `
      <div class="mx-detail-head">
        <h3>${esc(Name)}</h3>
        <span class="mx-total">${tracks.length} track${tracks.length === 1 ? '' : 's'} · ${total.clock}</span>
      </div>
      <ul class="mx-tracks">
        ${tracks.length ? tracks.map((t) => `
          <li>
            <span class="mx-pos">${t.Position}</span>
            <span class="mx-track-name">${esc(t.TrackName)}</span>
            <span class="mx-artist">${esc(t.Artist || '—')}</span>
            <span class="mx-dur">${msToClock(t.Milliseconds)}</span>
            <button class="mx-remove" title="Remove" data-remove="${t.TrackId}">✕</button>
          </li>`).join('') : `<li class="mx-placeholder">No tracks yet — search below to add some.</li>`}
      </ul>
      <div class="mx-search">
        <h3>Add from the library</h3>
        <input id="mx-search-input" type="search" placeholder="Search tracks, artists, albums…" autocomplete="off" />
        <ul class="mx-results" id="mx-results"></ul>
      </div>
    `;

    renderResults();
    const searchInput = detailEl.querySelector('#mx-search-input');
    searchInput.addEventListener('input', debounce(async () => {
      const q = searchInput.value.trim();
      if (!q) { searchResults = []; return renderResults(); }
      const r = await api.get(`${P}/tracks?q=${encodeURIComponent(q)}`);
      searchResults = r.status === 'ok' ? r.data : [];
      renderResults();
    }, 250));
  }

  function renderResults() {
    const el = detailEl.querySelector('#mx-results');
    if (!el) return;
    el.innerHTML = searchResults.length
      ? searchResults.map((t) => `
        <li>
          <span class="mx-track-name">${esc(t.TrackName)}</span>
          <span class="mx-artist">${esc(t.Artist || '—')}</span>
          <span class="mx-dur">${msToClock(t.Milliseconds)}</span>
          <button class="mx-add" data-add="${t.TrackId}">Add</button>
        </li>`).join('')
      : `<li class="mx-placeholder">Type above to search the Chinook track library.</li>`;
  }

  // Event delegation keeps handlers valid across re-renders.
  listEl.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-del]');
    if (del) {
      e.stopPropagation();
      if (!confirm('Delete this mixtape?')) return;
      const res = await api.del(`${P}/mixtapes/${del.dataset.del}`);
      if (res.status !== 'ok') return flash(flashArea, res.message || 'Delete failed');
      if (Number(del.dataset.del) === selectedId) selectedId = null;
      return loadList();
    }
    const li = e.target.closest('li[data-id]');
    if (li) loadDetail(Number(li.dataset.id));
  });

  detailEl.addEventListener('click', async (e) => {
    const add = e.target.closest('[data-add]');
    if (add) {
      const res = await api.post(`${P}/mixtapes/${selectedId}/tracks`, { trackId: Number(add.dataset.add) });
      if (res.status !== 'ok') return flash(flashArea, res.message || 'Add failed');
      flash(flashArea, res.message, res.data?.added ? 'success' : 'info');
      await loadDetail(selectedId);
      return loadList();
    }
    const rm = e.target.closest('[data-remove]');
    if (rm) {
      const res = await api.del(`${P}/mixtapes/${selectedId}/tracks/${rm.dataset.remove}`);
      if (res.status !== 'ok') return flash(flashArea, res.message || 'Remove failed');
      await loadDetail(selectedId);
      return loadList();
    }
  });

  root.querySelector('#mx-new').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = root.querySelector('#mx-new-name');
    const name = input.value.trim();
    if (!name) return;
    const res = await api.post(`${P}/mixtapes`, { name });
    if (res.status !== 'ok') return flash(flashArea, res.message || 'Could not create mixtape');
    input.value = '';
    selectedId = res.data.MixtapeId;
    loadList();
  });

  loadList();
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}
