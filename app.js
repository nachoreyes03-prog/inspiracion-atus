// Inspiración Atus: static version. All content comes from data.js (window.ATUS_DATA).
(() => {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (typeof v === 'boolean' || k === 'value') el[k] = v;
      else el.setAttribute(k, v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false || kid === '') continue;
      el.append(kid instanceof Node ? kid : String(kid));
    }
    return el;
  }
  // replaceChildren() would print "null" for empty slots, so filter them out
  const put = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false && k !== ''));

  const store = {
    get(k, d) { try { const v = localStorage.getItem('atus-inspo:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('atus-inspo:' + k, JSON.stringify(v)); } catch { /* private mode */ } },
  };

  const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const pad = n => String(n).padStart(2, '0');
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return String(u || '').replace(/^https?:\/\/(www\.)?/i, '').replace(/\/.*$/, ''); } };
  const safeHref = u => (/^https?:\/\//i.test(u || '') ? u : null);
  const imgSrc = p => encodeURI(String(p || ''));
  const hexOf = s => {
    const m = String(s || '').match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
    if (!m) return null;
    let x = m[1];
    if (x.length === 3) x = x.split('').map(c => c + c).join('');
    return '#' + x.toUpperCase();
  };
  const swatchLabel = s => String(s || '').replace(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i, '').replace(/^[\s—–:-]+/, '').trim();
  const fontName = s => String(s || '').split(/\s+[—–]\s+|\s+-\s+/)[0].trim();
  const arr = v => Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()) : (typeof v === 'string' && v.trim() ? [v] : []);
  const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const fmtDate = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}.${m[2]}.${m[1].slice(2)}` : ''; };
  const isTyping = el => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

  /* ---------- data ---------- */
  const DATA = window.ATUS_DATA || null;
  const seen = new Set();
  const REFS = (DATA && Array.isArray(DATA.refs) ? DATA.refs : []).filter(r => r && r.name).map((r, i) => {
    let id = String(r.id || slug(r.name) || 'ref-' + i);
    while (seen.has(id)) id += '-' + i;
    seen.add(id);
    return Object.assign({}, r, { id, _i: i });
  });
  const SOURCES = (DATA && Array.isArray(DATA.sources) ? DATA.sources : []).filter(s => s && s.name);
  const TASTE = DATA && DATA.taste ? DATA.taste : null;

  /* ---------- state ---------- */
  const S = {
    tab: 'refs', q: '', rubro: null, tag: null, atusOnly: false,
    mix: new Set(store.get('mix', []).filter(id => REFS.some(r => r.id === id))),
    aspects: store.get('aspects', {}),
    sheet: null, lastFocus: null, pushed: false,
  };

  /* ---------- feedback ---------- */
  let toastT = 0;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2400);
  }

  function copy(text, done) {
    if (!text) return;
    let p = null;
    try { p = navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(text) : null; } catch { p = null; }
    if (p && typeof p.then === 'function') p.then(() => toast(done || 'Copiado'), () => fallbackCopy(text, done));
    else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    const ta = h('textarea', { class: 'vh', readOnly: true, 'aria-hidden': 'true' });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    if (ok) toast(done || 'Copiado');
    else openCopySheet(text);
  }

  function restoreFocus(key) {
    if (!key) return;
    const el = document.querySelector('[data-key="' + CSS.escape(key) + '"]');
    if (el) el.focus();
  }
  function notice(title, text) {
    return h('div', { class: 'notice' }, h('h2', null, title), text ? h('p', null, text) : null);
  }

  /* ---------- queries ---------- */
  const haystack = r => norm([r.name, r.url, r.rubro, arr(r.tags).join(' '), r.likes, r.avoid, arr(r.fonts).join(' '), arr(r.palette).join(' '), r.layout, r.motion, r.stack, r.dna, r.prompt, r.atus ? 'atus' : ''].join(' '));
  function visibleRefs() {
    const terms = norm(S.q).split(/\s+/).filter(Boolean);
    return REFS.filter(r => {
      if (S.atusOnly && !r.atus) return false;
      if (S.rubro && r.rubro !== S.rubro) return false;
      if (S.tag && !arr(r.tags).includes(S.tag)) return false;
      if (!terms.length) return true;
      const hs = haystack(r);
      return terms.every(t => hs.includes(t));
    });
  }

  function buildPrompt(r) {
    const L = [`Diseñá una web con la dirección visual de ${r.name}${r.url ? ` (${host(r.url)})` : ''}.`];
    if (r.rubro) L.push(`Rubro de la referencia: ${r.rubro}.`);
    const f = arr(r.fonts); if (f.length) L.push(`Tipografía: ${f.join('; ')}.`);
    const p = arr(r.palette); if (p.length) L.push(`Paleta: ${p.join(', ')}.`);
    if (r.layout) L.push(`Layout: ${r.layout}`);
    if (r.motion) L.push(`Movimiento: ${r.motion}`);
    if (r.likes) L.push(`Lo que la hace buena: ${r.likes}`);
    else if (r.dna) L.push(`Lo que la hace buena: ${r.dna}`);
    if (r.avoid) L.push(`Evitar: ${r.avoid}`);
    L.push('Adaptalo a: [describí tu proyecto acá].');
    return L.join('\n');
  }
  const promptOf = r => (typeof r.prompt === 'string' && r.prompt.trim()) ? r.prompt.trim() : buildPrompt(r);

  /* ---------- tabs + url ---------- */
  const TABS = ['refs', 'discover', 'mix', 'sources', 'taste'];
  const TAB_HASH = { refs: 'referencias', discover: 'descubrir', mix: 'mezclar', sources: 'fuentes', taste: 'gusto' };
  const tabFromHash = hash => TABS.find(t => '#' + TAB_HASH[t] === hash) || null;
  const setHash = hash => { try { history.replaceState(history.state, '', hash); } catch { /* file:// quirks */ } };

  function setTab(t, opts) {
    if (!TABS.includes(t)) t = 'refs';
    S.tab = t;
    store.set('tab', t);
    for (const b of $$('.tab')) b.setAttribute('aria-selected', String(b.dataset.tab === t));
    for (const v of $$('.view')) v.hidden = v.id !== 'view-' + t;
    if (t === 'discover') renderDiscover();
    if (!opts || !opts.keepHash) setHash('#' + TAB_HASH[t]);
    if (!opts || opts.scroll !== false) window.scrollTo(0, 0);
  }

  /* ---------- render ---------- */
  function render() {
    renderCounts();
    renderFilters();
    renderGrid();
    renderMix();
    if (S.sheet && S.sheet.mode === 'detail') renderDetail();
  }

  function renderCounts() {
    $('#n-refs').textContent = pad(REFS.length);
    $('#n-mix').textContent = S.mix.size ? pad(S.mix.size) : '';
    $('#n-sources').textContent = pad(SOURCES.length);
    const fresh = liveAll().filter(i => Date.now() - Date.parse(i.date) < 7 * 864e5).length;
    $('#n-live').textContent = fresh ? pad(fresh) : '';
    const updated = DATA && fmtDate(DATA.updated);
    put($('#meta'),
      h('span', null, h('b', null, pad(REFS.length)), ' referencias'),
      h('span', null, h('b', null, pad(REFS.filter(r => r.atus).length)), ' para Atus'),
      h('span', null, h('b', null, pad(SOURCES.length)), ' fuentes'),
      updated ? h('span', null, 'actualizado ', h('b', null, updated)) : null);
  }

  function chip(label, pressed, onclick, key) {
    return h('button', { type: 'button', class: 'chip', 'aria-pressed': String(!!pressed), 'data-key': key, onclick: () => { onclick(); restoreFocus(key); } }, label);
  }

  function renderFilters() {
    const box = $('#filters');
    if (!REFS.length) { put(box); return; }
    const rubros = [...new Set(REFS.map(r => r.rubro).filter(Boolean))].sort((x, y) => x.localeCompare(y, 'es'));
    const counts = new Map();
    for (const r of REFS) for (const t of arr(r.tags)) counts.set(t, (counts.get(t) || 0) + 1);
    const tags = [...counts].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0], 'es')).slice(0, 18);
    const atusN = REFS.filter(r => r.atus).length;
    put(box,
      h('div', { class: 'frow' },
        h('span', { class: 'lbl' }, 'Ver'),
        chip('Todas', !S.atusOnly && !S.rubro && !S.tag, () => { S.atusOnly = false; S.rubro = null; S.tag = null; render(); }, 'f:all'),
        atusN ? chip(['Para Atus', h('span', { class: 'c' }, pad(atusN))], S.atusOnly, () => { S.atusOnly = !S.atusOnly; render(); }, 'f:atus') : null,
        rubros.length ? h('span', { class: 'sep', 'aria-hidden': 'true' }) : null,
        rubros.map(rb => chip(rb, S.rubro === rb, () => { S.rubro = S.rubro === rb ? null : rb; render(); }, 'f:r:' + rb))),
      tags.length ? h('div', { class: 'frow' },
        h('span', { class: 'lbl' }, 'Estilo'),
        tags.map(([t, c]) => chip([t, h('span', { class: 'c' }, c)], S.tag === t, () => { S.tag = S.tag === t ? null : t; render(); }, 'f:t:' + t))) : null);
  }

  function clearFilters() {
    S.q = ''; $('#q').value = '';
    S.atusOnly = false; S.rubro = null; S.tag = null;
    render();
    $('#q').focus();
  }

  function placeholder(r) {
    const hexes = arr(r.palette).map(hexOf).filter(Boolean);
    const el = h('span', { class: 'ph' }, h('span', { class: 'ph-name' }, r.name || ''));
    if (hexes[0]) el.style.background = hexes[0];
    if (hexes[1]) el.style.color = hexes[1];
    return el;
  }

  function card(r) {
    const shots = arr(r.shots);
    let imgA = null, imgB = null;
    if (shots[0]) {
      imgA = h('img', { src: imgSrc(shots[0]), alt: '', loading: 'lazy', decoding: 'async' });
      imgA.addEventListener('error', () => imgA.replaceWith(placeholder(r)), { once: true });
    }
    if (shots[1]) {
      imgB = h('img', { class: 'alt', src: imgSrc(shots[1]), alt: '', loading: 'lazy', decoding: 'async' });
      imgB.addEventListener('error', () => imgB.remove(), { once: true });
    }
    const inMix = S.mix.has(r.id);
    const hexes = arr(r.palette).map(hexOf).filter(Boolean).slice(0, 6);
    const fonts = arr(r.fonts).map(fontName).filter(Boolean);
    const blurb = r.likes || r.dna;
    return h('article', { class: 'card' },
      h('button', { class: 'shot', type: 'button', 'aria-label': 'Ver ' + r.name, 'data-key': 'card:' + r.id, onclick: e => openDetail(r.id, e.currentTarget) },
        imgA || placeholder(r), imgB, r.atus ? h('span', { class: 'badge' }, 'Atus') : null),
      h('div', { class: 'card-head' },
        h('h3', null, r.name),
        r.url ? h('span', { class: 'dom' }, host(r.url)) : null),
      (hexes.length || fonts.length) ? h('div', { class: 'card-dna' },
        hexes.length ? h('span', { class: 'sws', title: hexes.join(' ') }, hexes.map(x => h('i', { style: { background: x } }))) : null,
        fonts.length ? h('span', { class: 'fonts' }, fonts.join(' · ')) : null) : null,
      blurb ? h('p', { class: 'likes' + (r.likes ? '' : ' dna') }, blurb) : null,
      h('div', { class: 'card-actions' },
        h('button', { class: 'btn sm', type: 'button', onclick: () => copy(promptOf(r), 'Prompt de ' + r.name + ' copiado') }, 'Copiar prompt'),
        h('button', { class: 'btn sm ' + (inMix ? 'lime' : 'ghost'), type: 'button', 'aria-pressed': String(inMix), 'data-key': 'card-mix:' + r.id, onclick: () => toggleMix(r.id, 'card-mix:' + r.id) }, inMix ? '✓ En la mezcla' : '+ Mezcla')));
  }

  const cardCache = new Map();
  function getCard(r) {
    const sig = String(S.mix.has(r.id));
    const c = cardCache.get(r.id);
    if (c && c.sig === sig) return c.el;
    const el = card(r);
    cardCache.set(r.id, { sig, el });
    return el;
  }
  function reconcile(parent, nodes) {
    nodes.forEach((n, i) => { if (parent.children[i] !== n) parent.insertBefore(n, parent.children[i] || null); });
    while (parent.children.length > nodes.length) parent.lastElementChild.remove();
  }

  function renderGrid() {
    const grid = $('#grid'), info = $('#results');
    if (!DATA) {
      put(info);
      put(grid, notice('No encontré los datos', 'Falta el archivo data.js al lado de index.html, o tiene un error. Revisalo y recargá la página.'));
      return;
    }
    if (!REFS.length) {
      put(info);
      put(grid, notice('Todavía no hay referencias', 'Agregá la primera en data.js (los pasos están en el README) o pedíselo a Claude.'));
      return;
    }
    const list = visibleRefs();
    const filtered = list.length !== REFS.length;
    put(info,
      h('span', null, h('b', null, pad(list.length)), ' de ' + pad(REFS.length)),
      filtered ? h('button', { class: 'linkish', type: 'button', onclick: clearFilters }, 'Limpiar filtros') : null);
    if (!list.length) {
      put(grid, S.q
        ? notice(`Nada coincide con “${S.q}”`, 'Probá con otra palabra: un rubro, una fuente, un color en hex o algo de tus notas.')
        : notice('Ninguna referencia con esos filtros', 'Sacá algún filtro para ver más.'));
      return;
    }
    if (grid.querySelector('.notice')) put(grid);
    reconcile(grid, list.map(getCard));
  }

  function toggleMix(id, key) {
    const r = REFS.find(x => x.id === id);
    if (S.mix.has(id)) S.mix.delete(id); else S.mix.add(id);
    store.set('mix', [...S.mix]);
    render();
    restoreFocus(key);
    toast(S.mix.has(id) ? `${r.name} sumada a la mezcla (${S.mix.size})` : `${r.name} fuera de la mezcla`);
  }

  /* ---------- sheet ---------- */
  function setSheetHead(title, nav) {
    $('#sheet-title').textContent = title;
    $('#sheet-prev').hidden = !nav;
    $('#sheet-next').hidden = !nav;
  }
  function showSheet() {
    const sh = $('#sheet');
    const wasHidden = sh.hidden;
    sh.hidden = false;
    document.body.classList.add('locked');
    if (wasHidden) requestAnimationFrame(() => $('#sheet-close').focus());
  }
  // Closing goes through history when the sheet pushed an entry, so the phone's back button also closes it.
  function requestClose() {
    if (S.pushed) history.back();
    else closeSheet();
  }
  function closeSheet() {
    if (!S.sheet) return;
    const wasDetail = S.sheet.mode === 'detail';
    S.sheet = null;
    S.pushed = false;
    $('#sheet').hidden = true;
    put($('#sheet-body'));
    document.body.classList.remove('locked');
    if (wasDetail && /^#ref-/.test(location.hash)) setHash('#' + TAB_HASH[S.tab]);
    const f = S.lastFocus;
    S.lastFocus = null;
    if (f && document.contains(f)) f.focus();
  }

  function openCopySheet(text) {
    const wasOpen = !!S.sheet;
    if (!wasOpen) S.lastFocus = document.activeElement;
    S.sheet = { mode: 'copy' };
    setSheetHead('Copiar a mano', false);
    const ta = h('textarea', { class: 'in mono', rows: 16, readOnly: true, value: text });
    put($('#sheet-body'), h('div', { class: 'detail' },
      h('p', { class: 'prose' }, 'No pude copiar automáticamente. Seleccioná el texto y copialo (Ctrl+C, o mantené apretado en el celular).'), ta));
    showSheet();
    setTimeout(() => { ta.focus(); ta.select(); }, 60);
  }

  /* ---------- detail ---------- */
  const imgCache = new Map();
  function detailImg(path, alt) {
    let el = imgCache.get(path);
    if (!el) {
      el = h('img', { src: imgSrc(path), alt, decoding: 'async' });
      el.addEventListener('error', () => el.remove(), { once: true });
      imgCache.set(path, el);
    }
    el.alt = alt;
    return el;
  }

  function openDetail(id, opener) {
    const wasOpen = !!S.sheet;
    if (!wasOpen) S.lastFocus = opener || document.activeElement;
    S.sheet = { mode: 'detail', id };
    renderDetail();
    showSheet();
    $('#sheet-body').scrollTop = 0;
    const hash = '#ref-' + encodeURIComponent(id);
    if (!wasOpen && opener) {
      try { history.pushState({ sheet: true }, '', hash); S.pushed = true; } catch { S.pushed = false; }
    } else setHash(hash);
  }

  function stepDetail(d) {
    const list = visibleRefs();
    const i = list.findIndex(x => x.id === S.sheet.id);
    if (i < 0 || list.length < 2) return;
    const n = list[(i + d + list.length) % list.length];
    S.sheet = { mode: 'detail', id: n.id };
    renderDetail();
    $('#sheet-body').scrollTop = 0;
    setHash('#ref-' + encodeURIComponent(n.id));
    const c = cardCache.get(n.id);
    if (c) S.lastFocus = c.el.querySelector('.shot');
  }

  function section(label, content) {
    return h('section', { class: 'd-sec' }, h('h3', { class: 'field-lbl' }, label), content);
  }
  function codebox(label, text, btnLabel, onCopy) {
    return h('div', { class: 'codebox' },
      h('div', { class: 'codebox-head' }, h('span', null, label), h('button', { class: 'btn sm solid', type: 'button', onclick: onCopy }, btnLabel)),
      h('pre', null, text));
  }

  function dnaList(r) {
    const rows = [];
    const f = arr(r.fonts);
    if (f.length) rows.push(['Tipografía', h('ul', { class: 'fontlist' }, f.map(x => h('li', null, x)))]);
    const p = arr(r.palette);
    if (p.length) rows.push(['Paleta', h('div', { class: 'palette' }, p.map(x => {
      const hx = hexOf(x), lb = swatchLabel(x);
      return hx
        ? h('button', { class: 'swatch', type: 'button', title: 'Copiar ' + hx, onclick: () => copy(hx, hx + ' copiado') }, h('i', { style: { background: hx } }), h('span', null, hx, lb ? h('br') : null, lb))
        : h('span', null, x);
    }))]);
    if (r.layout) rows.push(['Layout', r.layout]);
    if (r.motion) rows.push(['Movimiento', r.motion]);
    if (r.stack) rows.push(['Hecha con', r.stack]);
    if (!rows.length) return null;
    return h('dl', { class: 'dl' }, rows.map(([k, v]) => [h('dt', null, k), h('dd', null, v)]));
  }

  function renderDetail() {
    const r = REFS.find(x => x.id === S.sheet.id);
    if (!r) { requestClose(); return; }
    const list = visibleRefs();
    const pos = list.findIndex(x => x.id === r.id);
    setSheetHead(pos >= 0 ? `${pad(pos + 1)} / ${pad(list.length)}` : 'Referencia', pos >= 0 && list.length > 1);
    const shots = arr(r.shots);
    const inMix = S.mix.has(r.id);
    const tags = arr(r.tags);
    put($('#sheet-body'), h('article', { class: 'detail' },
      shots.length ? h('div', { class: 'd-shots' }, detailImg(shots[0], `Captura 1 de ${r.name}`)) : null,
      h('div', { class: 'd-head' },
        h('h2', null, r.name),
        h('div', { class: 'd-sub' },
          safeHref(r.url) ? h('a', { href: r.url, target: '_blank', rel: 'noopener noreferrer' }, host(r.url) + ' ↗') : null,
          r.rubro ? h('span', null, r.rubro) : null,
          r.atus ? h('span', { class: 'badge inline' }, 'Para Atus') : null),
        tags.length ? h('div', { class: 'tags' }, tags.map(t => h('button', {
          class: 'tag', type: 'button', title: 'Ver todas con “' + t + '”',
          onclick: () => { S.tag = t; S.atusOnly = false; S.rubro = null; S.lastFocus = null; requestClose(); setTab('refs'); render(); },
        }, t))) : null,
        h('div', { class: 'd-actions' },
          h('button', { class: 'btn solid', type: 'button', onclick: () => copy(promptOf(r), 'Prompt copiado') }, 'Copiar prompt'),
          h('button', { class: 'btn ' + (inMix ? 'lime' : ''), type: 'button', 'aria-pressed': String(inMix), 'data-key': 'd-mix', onclick: () => toggleMix(r.id, 'd-mix') }, inMix ? '✓ En la mezcla' : '+ Sumar a la mezcla'),
          safeHref(r.url) ? h('a', { class: 'btn ghost', href: r.url, target: '_blank', rel: 'noopener noreferrer' }, 'Abrir sitio ↗') : null)),
      r.likes ? section('Lo que me gusta', h('p', { class: 'quote' }, r.likes)) : null,
      r.avoid ? section('Evitar', h('p', { class: 'prose' }, r.avoid)) : null,
      r.dna ? section('Por qué funciona', h('p', { class: 'prose' }, r.dna)) : null,
      codebox('Prompt para pedir algo así', promptOf(r), 'Copiar prompt', () => copy(promptOf(r), 'Prompt copiado')),
      dnaList(r),
      shots.length > 1 ? h('div', { class: 'd-shots' }, shots.slice(1).map((p, i) => detailImg(p, `Captura ${i + 2} de ${r.name}`))) : null));
  }

  /* ---------- mix ---------- */
  const ASPECTS = [
    { k: 'type', label: 'Tipografía', get: r => arr(r.fonts).join('; ') },
    { k: 'color', label: 'Paleta', get: r => arr(r.palette).join(', ') },
    { k: 'layout', label: 'Layout y grilla', get: r => r.layout || '' },
    { k: 'motion', label: 'Movimiento', get: r => r.motion || '' },
    { k: 'tone', label: 'Actitud', get: r => r.likes || r.dna || '' },
  ];
  const mixRefs = () => REFS.filter(r => S.mix.has(r.id));
  function aspectPick(a, i, sel) {
    const cur = S.aspects[a.k];
    if (cur === 'none') return null;
    const found = sel.find(r => r.id === cur && a.get(r));
    if (found) return found;
    for (let j = 0; j < sel.length; j++) { const r = sel[(i + j) % sel.length]; if (a.get(r)) return r; }
    return null;
  }

  function renderMix() {
    const sel = mixRefs();
    put($('#mix-picker'), REFS.length ? REFS.map(r => {
      const hx = arr(r.palette).map(hexOf).filter(Boolean)[0];
      return h('button', { type: 'button', class: 'chip', 'aria-pressed': String(S.mix.has(r.id)), 'data-key': 'mix:' + r.id, onclick: () => toggleMix(r.id, 'mix:' + r.id) },
        hx ? h('i', { class: 'dot', style: { background: hx } }) : null, r.name);
    }) : h('p', { class: 'muted' }, 'Todavía no hay referencias para mezclar.'));
    if (!sel.length) {
      put($('#mix-aspects'), h('p', { class: 'muted' }, 'Elegí al menos una referencia. Con dos o más decidís qué tomar de cada una.'));
    } else {
      put($('#mix-aspects'), ASPECTS.map((a, i) => {
        const pick = aspectPick(a, i, sel);
        const select = h('select', { class: 'in', id: 'mix-' + a.k },
          sel.map(r => h('option', { value: r.id, disabled: !a.get(r) }, r.name + (a.get(r) ? '' : ' (sin dato)'))),
          h('option', { value: 'none' }, 'No tomar'));
        select.value = pick ? pick.id : 'none';
        select.addEventListener('change', () => { S.aspects[a.k] = select.value; store.set('aspects', S.aspects); renderMixOut(); });
        return h('div', { class: 'aspect' }, h('label', { for: 'mix-' + a.k }, a.label), h('div', { class: 'sel' }, select));
      }));
    }
    renderMixOut();
  }

  function mixPrompt() {
    const sel = mixRefs();
    if (!sel.length) return '';
    const what = $('#mix-what').value.trim(), sections = $('#mix-sections').value.trim(), useTaste = $('#mix-taste').checked;
    const L = [`Diseñá ${what || '[qué vas a diseñar: por ejemplo, la web de un estudio de arquitectura]'}.`];
    if (sections) L.push(`Secciones: ${sections}.`);
    L.push('', sel.length > 1 ? 'Mezclá estas referencias tomando algo concreto de cada una:' : 'Usá esta referencia como dirección visual:');
    ASPECTS.forEach((a, i) => {
      const r = aspectPick(a, i, sel);
      if (r) L.push(`- ${a.label}, de ${r.name}${r.url ? ` (${host(r.url)})` : ''}: ${a.get(r)}`);
    });
    const avoid = [...sel.map(r => r.avoid).filter(Boolean), ...(useTaste && TASTE ? arr(TASTE.avoid) : [])];
    if (avoid.length) L.push('', 'Evitar:', ...avoid.map(x => '- ' + x));
    if (useTaste && TASTE && TASTE.brief) L.push('', 'Mi gusto en general (Atus):', String(TASTE.brief).trim());
    L.push('', 'Antes de escribir código, resumí en 5 líneas la dirección: tipografías, colores en hex, grilla, movimiento y el detalle que la va a hacer memorable. Que no parezca una plantilla.');
    return L.join('\n');
  }
  function renderMixOut() {
    const text = mixPrompt(), out = $('#mix-out');
    out.textContent = text || 'El prompt aparece acá cuando elegís referencias.';
    out.classList.toggle('muted', !text);
    $('#mix-copy').disabled = !text;
  }

  /* ---------- sources + taste (static) ---------- */
  function renderSources() {
    const list = $('#src-list');
    if (!SOURCES.length) { put(list, h('li', { class: 'src' }, h('p', { class: 'muted' }, 'Todavía no hay fuentes en data.js.'))); return; }
    const items = SOURCES.map((s, i) => ({ s, i })).sort((a, b) => (b.s.fav ? 1 : 0) - (a.s.fav ? 1 : 0) || a.i - b.i).map(x => x.s);
    put(list, items.map(s => h('li', { class: 'src' },
      h('div', { class: 'src-main' },
        safeHref(s.url) ? h('a', { class: 'src-name', href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.name, ' ↗') : h('span', { class: 'src-name' }, s.name),
        s.url ? h('span', { class: 'dom' }, host(s.url)) : null,
        s.fav ? h('span', { class: 'fav' }, 'Muy buena') : null),
      h('p', { class: 'src-note' }, s.note || ''),
      h('div', { class: 'tags' }, arr(s.bestFor).map(t => h('span', { class: 'tag static' }, t))))));
  }

  function tagBars() {
    const n = REFS.length;
    const m = new Map();
    for (const r of REFS) for (const t of arr(r.tags)) m.set(t, (m.get(t) || 0) + 1);
    const top = [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')).slice(0, 10);
    if (!top.length) return h('p', { class: 'muted' }, 'Tus referencias todavía no tienen tags.');
    return h('div', { class: 'bars' }, top.map(([t, c]) => h('div', { class: 'bar' },
      h('span', { class: 'k' }, t),
      h('span', { class: 'track' }, h('span', { class: 'fill', style: { width: (c / n * 100).toFixed(1) + '%' } })),
      h('span', { class: 'v' }, c + '/' + n))));
  }

  function renderTaste() {
    const t = TASTE;
    put($('#taste-body'),
      h('p', { class: 'taste-summary' }, t && t.summary ? t.summary : 'Todavía no hay un perfil de gusto en data.js.'),
      h('div', { class: 'taste-cols' },
        h('div', null, h('h2', null, 'Se repite en tus referencias'), arr(t && t.rules).length ? h('ul', { class: 'rules' }, arr(t.rules).map(x => h('li', null, x))) : h('p', { class: 'muted' }, 'Sin datos todavía.')),
        h('div', null, h('h2', null, 'Lo que evitás'), arr(t && t.avoid).length ? h('ul', { class: 'rules' }, arr(t.avoid).map(x => h('li', null, x))) : h('p', { class: 'muted' }, 'Sin datos todavía.')),
        h('div', null, h('h2', null, 'Tags en tu archivo'), tagBars())),
      t && t.brief ? codebox('Brief de gusto: pegalo antes de pedir un diseño', String(t.brief), 'Copiar brief', () => copy(String(t.brief), 'Brief copiado')) : null,
      h('p', { class: 'muted prose' }, 'Cuando le pidas un diseño a Claude, decile “usá mi Inspiración Atus” o pegale este brief.'));
  }

  /* ---------- discover: gallery search + live feed ---------- */
  // Galleries are English-indexed; queries without "web/site" get "website" added where the site mixes other content.
  const web = q => q ? (/\b(web|site|landing|ui)/i.test(q) ? q : q + ' website') : 'website design';
  const enc = encodeURIComponent;
  const GALLERIES = [
    { name: 'Pinterest', url: q => 'https://ar.pinterest.com/search/pins/?q=' + enc(web(q)) },
    { name: 'Savee', url: q => 'https://savee.com/search/?q=' + enc(q || 'website') },
    { name: 'Behance', url: q => 'https://www.behance.net/search/projects/' + enc(web(q)) },
    { name: 'Awwwards', url: q => q ? 'https://www.awwwards.com/websites/?text=' + enc(q) : 'https://www.awwwards.com/websites/' },
    { name: 'CSS Design Awards', url: q => q ? 'https://www.cssdesignawards.com/search?q=' + enc(q) : 'https://www.cssdesignawards.com/website-gallery' },
    { name: 'Minimal Gallery', url: q => q ? 'https://minimal.gallery/?s=' + enc(q) : 'https://minimal.gallery/' },
    { name: 'Land-book', url: q => q ? 'https://land-book.com/?search=' + enc(q) : 'https://land-book.com/' },
    { name: 'One Page Love', url: q => q ? 'https://onepagelove.com/?s=' + enc(q) : 'https://onepagelove.com/' },
    { name: 'SiteInspire', url: q => q ? 'https://www.siteinspire.com/websites?search=' + enc(q) : 'https://www.siteinspire.com/' },
    { name: 'Dribbble', url: q => 'https://dribbble.com/search/' + enc(web(q)) },
    { name: 'Fonts In Use', hint: 'tipografía', url: q => q ? 'https://fontsinuse.com/search?terms=' + enc(q) : 'https://fontsinuse.com/' },
    { name: '21st.dev', hint: 'componentes', url: q => q ? 'https://21st.dev/community/components/s/' + enc(q) : 'https://21st.dev/' },
    { name: 'ecomm.design', hint: 'ecommerce', url: q => q ? 'https://ecomm.design/?s=' + enc(q) : 'https://ecomm.design/' },
    { name: 'Google Imágenes', url: q => 'https://www.google.com/search?tbm=isch&q=' + enc(web(q)) },
  ];
  // Ideas come from the taste profile: label in Spanish, query in English for the galleries.
  const IDEAS = [
    ['Portfolio oscuro', 'dark portfolio'], ['Tipografía gigante', 'big typography'], ['Grilla suiza', 'swiss grid'],
    ['Arquitectura', 'architecture'], ['Interiores', 'interior design'], ['Estudio creativo', 'creative studio'],
    ['Blanco y negro', 'black and white'], ['Grano y textura', 'grain texture'], ['Editorial', 'editorial'],
    ['Músicos', 'musician'], ['Brutalista', 'brutalist'], ['Scroll horizontal', 'horizontal scroll'],
    ['Moda', 'fashion'], ['Fotografía', 'photography portfolio'],
  ];
  // Words from the taste profile that make a new site worth flagging "Para vos" (feeds are in English).
  const FOR_YOU = [['portfolio', 3], ['architect', 3], ['interior', 3], ['typograph', 3], ['big type', 3], ['swiss', 3],
    ['studio', 2], ['minimal', 2], ['dark', 2], ['black', 2], ['monochrom', 2], ['editorial', 2], ['grid', 2], ['photograph', 2],
    ['agency', 2], ['brutal', 2], ['grain', 2], ['music', 2], ['type', 1], ['museum', 1], ['gallery', 1], ['fashion', 1], ['creative', 1]];
  const PAGE = 24;

  const L = { filter: 'all', rank: null, shown: PAGE, saved: store.get('saved', []), clearConfirm: false, rendered: false };

  const liveData = () => window.ATUS_LIVE || null;
  const liveAll = () => {
    const D = liveData();
    return D && Array.isArray(D.items) ? D.items.filter(i => i && safeHref(i.link) && i.title) : [];
  };
  const liveText = i => norm([i.title, i.name, i.tagline, i.desc, arr(i.cats).join(' '), i.source].join(' '));
  const forYou = i => { const s = liveText(i); return FOR_YOU.reduce((n, [k, w]) => n + (s.includes(k) ? w : 0), 0); };
  const ago = iso => {
    const t = Date.parse(iso);
    if (!t) return '';
    const m = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (m < 60) return `hace ${m || 1} min`;
    const hrs = Math.round(m / 60);
    if (hrs < 24) return `hace ${hrs} h`;
    const d = Math.round(hrs / 24);
    return d === 1 ? 'ayer' : `hace ${d} días`;
  };
  const dayOf = iso => { const d = new Date(iso); return isNaN(d) ? '' : pad(d.getDate()) + '.' + pad(d.getMonth() + 1); };

  function renderDiscover() {
    L.rendered = true;
    renderGalleries();
    renderLive();
  }

  function renderGalleries() {
    const q = $('#dq').value.trim();
    put($('#d-ideas'),
      h('span', { class: 'lbl' }, 'Ideas'),
      IDEAS.map(([label, query]) => chip(label, norm(q) === norm(query), () => setQuery(norm(q) === norm(query) ? '' : query), 'idea:' + query)),
      h('button', { class: 'btn sm', type: 'button', 'data-key': 'idea:random', onclick: () => {
        const pool = IDEAS.filter(([, query]) => norm(query) !== norm(q));
        setQuery(pool[Math.floor(Math.random() * pool.length)][1]);
        restoreFocus('idea:random');
      } }, 'Sorprendeme'));
    put($('#d-links'), GALLERIES.map(g => h('a', { class: 'gal', href: g.url(q), target: '_blank', rel: 'noopener noreferrer' },
      h('span', null, g.name), g.hint ? h('small', null, g.hint) : null)));
  }

  function setQuery(q) {
    $('#dq').value = q;
    store.set('dq', q);
    L.shown = PAGE;
    renderGalleries();
    renderLive();
  }

  function liveList() {
    const all = liveAll();
    let list;
    if (L.filter === 'saved') list = L.saved.map(s => all.find(i => i.link === s.link) || s);
    else if (L.filter === 'all' || L.filter === 'foryou') list = all;
    else list = all.filter(i => i.source === L.filter);
    const terms = norm($('#dq').value).split(/\s+/).filter(Boolean);
    if (terms.length) list = list.filter(i => { const s = liveText(i); return terms.every(t => s.includes(t)); });
    const byDate = (a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0);
    if (L.filter === 'foryou') {
      return list.map(i => [i, forYou(i)]).filter(([, s]) => s >= 3).sort((a, b) => b[1] - a[1] || byDate(a[0], b[0])).map(([i]) => i);
    }
    if (L.rank) return [...list].sort((a, b) => (L.rank.get(a.link) ?? 1) - (L.rank.get(b.link) ?? 1));
    return L.filter === 'saved' ? list : [...list].sort(byDate);
  }

  function liveCard(it) {
    const saved = L.saved.some(s => s.link === it.link);
    const title = it.name || it.title;
    const ph = () => h('span', { class: 'ph' }, h('span', { class: 'ph-name' }, title));
    let img = null;
    if (safeHref(it.image)) {
      img = h('img', { src: it.image, alt: '', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
      img.addEventListener('error', () => img.replaceWith(ph()), { once: true });
    }
    const blurb = it.tagline || it.desc;
    return h('article', { class: 'card' },
      h('a', { class: 'shot', href: it.link, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `Ver ${title} en ${it.source}` },
        img || ph(), forYou(it) >= 5 ? h('span', { class: 'badge' }, 'Para vos') : null),
      h('div', { class: 'card-head' }, h('h3', null, title), h('span', { class: 'dom' }, [it.source, dayOf(it.date)].filter(Boolean).join(' · '))),
      blurb ? h('p', { class: 'likes dna' }, blurb) : null,
      arr(it.cats).length ? h('div', { class: 'tags' }, arr(it.cats).slice(0, 3).map(c => h('span', { class: 'tag static' }, c))) : null,
      h('div', { class: 'card-actions' },
        h('a', { class: 'btn sm', href: it.link, target: '_blank', rel: 'noopener noreferrer' }, 'Ver ↗'),
        h('button', { class: 'btn sm ' + (saved ? 'lime' : 'ghost'), type: 'button', 'aria-pressed': String(saved), 'data-key': 'save:' + it.link, onclick: () => toggleSave(it) }, saved ? '✓ Guardada' : 'Guardar')));
  }

  const liveCache = new Map();
  function getLiveCard(it) {
    const sig = String(L.saved.some(s => s.link === it.link));
    const c = liveCache.get(it.link);
    if (c && c.sig === sig) return c.el;
    const el = liveCard(it);
    liveCache.set(it.link, { sig, el });
    return el;
  }

  function renderLive() {
    if (!L.rendered) return;
    const D = liveData(), all = liveAll();
    const names = D && Array.isArray(D.sources) ? D.sources.filter(s => s.ok !== false).map(s => s.name).filter(Boolean) : [...new Set(all.map(i => i.source))];
    put($('#live-meta'), all.length
      ? [h('span', null, h('b', null, String(all.length)), ' webs'), D.updated ? h('span', null, 'actualizado ', h('b', null, ago(D.updated))) : null, names.length ? h('span', null, names.join(' · ')) : null]
      : h('span', null, 'Las novedades se cargan una vez por día desde GitHub.'));

    const counts = new Map();
    for (const i of all) counts.set(i.source, (counts.get(i.source) || 0) + 1);
    if (L.filter !== 'all' && L.filter !== 'foryou' && L.filter !== 'saved' && !counts.has(L.filter)) L.filter = 'all';
    const setFilter = f => { L.filter = f; L.shown = PAGE; renderLive(); };
    put($('#live-filters'),
      h('span', { class: 'lbl' }, 'Ver'),
      chip('Todas', L.filter === 'all', () => setFilter('all'), 'live:all'),
      chip('Para vos', L.filter === 'foryou', () => setFilter('foryou'), 'live:foryou'),
      chip(['Guardadas', h('span', { class: 'c' }, pad(L.saved.length))], L.filter === 'saved', () => setFilter('saved'), 'live:saved'),
      counts.size ? h('span', { class: 'sep', 'aria-hidden': 'true' }) : null,
      [...counts].map(([name, n]) => chip([name, h('span', { class: 'c' }, n)], L.filter === name, () => setFilter(name), 'live:' + name)));

    const bar = $('#saved-bar');
    bar.hidden = !L.saved.length;
    if (L.saved.length) {
      put(bar,
        h('p', null, `Tenés ${L.saved.length} ${L.saved.length === 1 ? 'web guardada' : 'webs guardadas'} en este dispositivo. Pasáselas a Claude para sumarlas a tus referencias.`),
        h('button', { class: 'btn sm solid', type: 'button', onclick: copySaved }, 'Copiar para Claude'),
        h('button', { class: 'btn sm ' + (L.clearConfirm ? 'danger' : 'ghost'), type: 'button', 'data-key': 'saved:clear', onclick: clearSaved }, L.clearConfirm ? '¿Vaciar la lista?' : 'Vaciar'));
    }

    const grid = $('#live-grid'), more = $('#live-more');
    const list = liveList();
    if (!all.length && L.filter !== 'saved') {
      more.hidden = true;
      put(grid, notice('Todavía no hay novedades', 'El robot de GitHub las trae una vez por día. Si abriste el archivo en tu compu, mirá la versión online.'));
      return;
    }
    if (!list.length) {
      more.hidden = true;
      const q = $('#dq').value.trim();
      put(grid, L.filter === 'saved' && !q
        ? notice('No guardaste nada todavía', 'Tocá “Guardar” en las webs que te gusten y después copialas para Claude.')
        : L.filter === 'foryou' && !q
          ? notice('Nada para vos en esta tanda', 'Mañana llegan más. Mientras, mirá Todas.')
          : notice(`Nada en las novedades con “${q}”`, 'Probá esa búsqueda en las galerías de arriba.'));
      return;
    }
    if (grid.querySelector('.notice')) put(grid);
    reconcile(grid, list.slice(0, L.shown).map(getLiveCard));
    more.hidden = list.length <= L.shown;
    more.textContent = `Ver más (${list.length - Math.min(list.length, L.shown)})`;
  }

  function toggleSave(it) {
    const key = 'save:' + it.link;
    if (L.saved.some(s => s.link === it.link)) L.saved = L.saved.filter(s => s.link !== it.link);
    else L.saved = [{ link: it.link, title: it.title, name: it.name || '', source: it.source, image: it.image || '', date: it.date || '' }, ...L.saved];
    store.set('saved', L.saved);
    L.clearConfirm = false;
    renderLive();
    restoreFocus(key);
    toast(L.saved.some(s => s.link === it.link) ? 'Guardada' : 'Sacada de guardadas');
  }

  function copySaved() {
    const lines = L.saved.map(s => `- ${s.name || s.title} (${s.source}): ${s.link}`);
    copy(['Agregá estas webs a mi Inspiración Atus. Abrí cada una, sacá captura y armá el ADN y el prompt como las demás:', ...lines].join('\n'), 'Lista copiada: pegásela a Claude');
  }

  let clearT = 0;
  function clearSaved() {
    clearTimeout(clearT);
    if (!L.clearConfirm) {
      L.clearConfirm = true;
      renderLive();
      restoreFocus('saved:clear');
      clearT = setTimeout(() => { L.clearConfirm = false; renderLive(); }, 4000);
      return;
    }
    L.clearConfirm = false;
    L.saved = [];
    store.set('saved', L.saved);
    if (L.filter === 'saved') L.filter = 'all';
    renderLive();
    toast('Lista vaciada');
  }

  function shuffleLive() {
    L.rank = new Map(liveAll().map(i => [i.link, Math.random()]));
    if (L.filter === 'foryou' || L.filter === 'saved') L.filter = 'all';
    L.shown = PAGE;
    renderLive();
    $('#live-grid').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function refreshLive() {
    const btn = $('#live-refresh');
    const before = (liveData() || {}).updated || '';
    btn.disabled = true;
    btn.textContent = 'Actualizando…';
    const s = document.createElement('script');
    s.src = 'live.js?t=' + Date.now();
    const done = ok => {
      s.remove();
      btn.disabled = false;
      btn.textContent = 'Actualizar';
      if (!ok) { toast('No pude actualizar. Revisá la conexión.'); return; }
      const now = (liveData() || {}).updated || '';
      L.rank = null;
      renderCounts();
      renderLive();
      toast(now && now !== before ? 'Llegaron novedades' : `Ya tenés lo último${now ? ' (' + ago(now) + ')' : ''}`);
    };
    s.onload = () => done(true);
    s.onerror = () => done(false);
    document.head.append(s);
  }

  /* ---------- boot ---------- */
  function applyHash() {
    const hash = location.hash;
    const m = hash.match(/^#ref-(.+)$/);
    if (m) {
      const id = decodeURIComponent(m[1]);
      if (REFS.some(r => r.id === id)) {
        if (S.tab !== 'refs') setTab('refs', { scroll: false, keepHash: true });
        if (!S.sheet || S.sheet.id !== id) openDetail(id);
        return;
      }
    }
    if (S.sheet) closeSheet();
    const t = tabFromHash(hash);
    if (t && t !== S.tab) setTab(t, { scroll: false, keepHash: true });
  }

  function boot() {
    for (const b of $$('.tab')) b.addEventListener('click', () => setTab(b.dataset.tab));
    $('#mark').addEventListener('click', e => { e.preventDefault(); setTab('refs'); });
    $('#q').addEventListener('input', e => { S.q = e.target.value; renderGrid(); });
    if (window.matchMedia && matchMedia('(max-width: 760px)').matches) $('#q').placeholder = 'Rubro, fuente, color, estilo…';

    $('#mix-what').value = store.get('mixWhat', '');
    $('#mix-sections').value = store.get('mixSections', '');
    $('#mix-taste').checked = store.get('mixTaste', true);
    $('#mix-what').addEventListener('input', e => { store.set('mixWhat', e.target.value); renderMixOut(); });
    $('#mix-sections').addEventListener('input', e => { store.set('mixSections', e.target.value); renderMixOut(); });
    $('#mix-taste').addEventListener('change', e => { store.set('mixTaste', e.target.checked); renderMixOut(); });
    $('#mix-copy').addEventListener('click', () => copy(mixPrompt(), 'Prompt de mezcla copiado'));

    $('#dq').value = store.get('dq', '');
    let dqT = 0;
    $('#dq').addEventListener('input', e => {
      store.set('dq', e.target.value);
      L.shown = PAGE;
      renderGalleries();
      clearTimeout(dqT);
      dqT = setTimeout(renderLive, 150);
    });
    $('#live-shuffle').addEventListener('click', shuffleLive);
    $('#live-refresh').addEventListener('click', refreshLive);
    $('#live-more').addEventListener('click', () => { L.shown += PAGE; renderLive(); });

    $('#sheet-close').addEventListener('click', requestClose);
    $('#sheet-scrim').addEventListener('click', requestClose);
    $('#sheet-prev').addEventListener('click', () => stepDetail(-1));
    $('#sheet-next').addEventListener('click', () => stepDetail(1));
    window.addEventListener('popstate', applyHash);

    document.addEventListener('keydown', e => {
      if (!S.sheet) {
        if (e.key === '/' && !isTyping(e.target) && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          if (S.tab !== 'refs') setTab('refs', { scroll: false });
          $('#q').focus();
        }
        return;
      }
      if (e.key === 'Escape') { e.preventDefault(); requestClose(); return; }
      if (S.sheet.mode === 'detail' && !isTyping(e.target) && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        stepDetail(e.key === 'ArrowRight' ? 1 : -1);
        return;
      }
      if (e.key === 'Tab') {
        const f = $$('#sheet-panel button, #sheet-panel a[href], #sheet-panel textarea:not(.vh)').filter(x => !x.disabled && x.getClientRects().length);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    const initial = tabFromHash(location.hash) || (/^#ref-/.test(location.hash) ? 'refs' : store.get('tab', 'refs'));
    setTab(initial, { scroll: false, keepHash: /^#ref-/.test(location.hash) });
    renderSources();
    renderTaste();
    render();
    applyHash();
  }

  boot();
})();
