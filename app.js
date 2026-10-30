// Inspiración Atus: static site. Content comes from data.js (window.ATUS_DATA) and live.js (window.ATUS_LIVE).
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
  const fmtN = n => n.toLocaleString('es-AR');
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return String(u || '').replace(/^https?:\/\/(www\.)?/i, '').replace(/\/.*$/, ''); } };
  const safeHref = u => (/^https?:\/\//i.test(u || '') ? u : null);
  // Remote image URLs are already encoded; only local paths (img/…) need it
  const imgSrc = p => (/^https?:\/\//i.test(p || '') ? p : encodeURI(String(p || '')));
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
  const arr2 = v => (Array.isArray(v) ? v : []);
  const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const isTyping = el => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  const dayOf = iso => { const d = new Date(iso); return isNaN(d) ? '' : pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + String(d.getFullYear()).slice(2); };
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

  /* ---------- data ---------- */
  const DATA = window.ATUS_DATA || null;
  const seenIds = new Set();
  const ALL_REFS = (DATA && Array.isArray(DATA.refs) ? DATA.refs : []).filter(r => r && r.name).map((r, i) => {
    let id = String(r.id || slug(r.name) || 'ref-' + i);
    while (seenIds.has(id)) id += '-' + i;
    seenIds.add(id);
    return Object.assign({}, r, { id });
  });
  // "Sacar" hides a reference on this device at once; the robot then deletes it from data.js.
  // Ids the robot already deleted drop out of the list.
  const HIDDEN = new Set(store.get('removed', []).filter(id => ALL_REFS.some(r => r.id === id)));
  store.set('removed', [...HIDDEN]);
  const REFS = ALL_REFS.filter(r => !HIDDEN.has(r.id));
  const syncRefs = () => REFS.splice(0, REFS.length, ...ALL_REFS.filter(r => !HIDDEN.has(r.id)));
  // ★ sites the robot saved from Descubrir: the gallery's picture and page, no DNA of their own
  for (const r of ALL_REFS) if (r.gallery) r.mixText = { type: `la tipografía de ${r.name}`, color: `los colores de ${r.name}`, layout: `el layout de ${r.name}`, motion: `el movimiento de ${r.name}`, tone: r.desc || `la actitud de ${r.name}` };

  // Folders, one per client. They live in data.js; what changed on this device and isn't uploaded
  // yet waits in PEND, and each pending change drops out once data.js shows it.
  const DATA_FOLDERS = (DATA && Array.isArray(DATA.folders) ? DATA.folders : []).filter(f => f && f.id && f.name);
  const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
  const PEND = (() => {
    const p = Object.assign({ folderAdds: [], folderRenames: {}, folderRemoves: [], refs: {} }, store.get('pending', {}));
    const inData = id => DATA_FOLDERS.find(f => f.id === id);
    p.folderAdds = (Array.isArray(p.folderAdds) ? p.folderAdds : []).filter(f => f && f.id && f.name && !inData(f.id));
    for (const [id, name] of Object.entries(p.folderRenames || {})) if (!inData(id) || inData(id).name === name) delete p.folderRenames[id];
    p.folderRemoves = arr(p.folderRemoves).filter(id => inData(id));
    for (const [id, list] of Object.entries(p.refs || {})) {
      const r = ALL_REFS.find(x => x.id === id);
      if (!r || sameSet(arr(list), arr(r.folders))) delete p.refs[id];
    }
    return p;
  })();
  const savePend = () => store.set('pending', PEND);
  store.set('pending', PEND);
  function folderList() {
    const gone = new Set(PEND.folderRemoves);
    return [...DATA_FOLDERS, ...PEND.folderAdds].filter(f => !gone.has(f.id)).map(f => ({ id: f.id, name: PEND.folderRenames[f.id] || f.name }));
  }
  const folderName = id => (folderList().find(f => f.id === id) || {}).name || id;
  const findFolderByName = name => (folderList().find(f => norm(f.name) === norm(name)) || {}).id || null;
  function createFolder(name) {
    const ids = new Set([...DATA_FOLDERS, ...PEND.folderAdds].map(f => f.id));
    let id = slug(name) || 'carpeta';
    for (let i = 2; ids.has(id); i++) id = id.replace(/-\d+$/, '') + '-' + i;
    PEND.folderAdds.push({ id, name });
    savePend();
    return id;
  }
  const TASTE = DATA && DATA.taste ? DATA.taste : null;

  /* ---------- search: a rubro in Spanish or English, ranked ---------- */
  // Spanish words → the English terms the galleries use. English words find their row too.
  const SYN = {
    dentista: ['dentist', 'dental', 'orthodont', 'teeth', 'smile', 'zahnarzt'], odontologia: ['dentist', 'dental', 'orthodont'], ortodoncia: ['orthodont', 'dental', 'dentist'],
    clinica: ['clinic', 'medical', 'health', 'doctor', 'care', 'praxis'], medico: ['doctor', 'medical', 'clinic', 'health'], salud: ['health', 'medical', 'wellness', 'care'],
    hospital: ['hospital', 'medical', 'health'], farmacia: ['pharmacy', 'pharma'], psicologo: ['psycholog', 'therap', 'mental health', 'counsel'], terapia: ['therap', 'wellness'],
    veterinaria: ['veterinar', 'vet', 'pet', 'animal'], mascota: ['pet', 'dog', 'cat'],
    abogado: ['lawyer', 'law', 'legal', 'attorney'], legal: ['legal', 'law', 'lawyer'],
    restaurante: ['restaurant', 'food', 'dining', 'bistro', 'kitchen', 'eatery'], comida: ['food', 'restaurant', 'recipe', 'kitchen'],
    cafe: ['coffee', 'cafe', 'roaster'], cafeteria: ['coffee', 'cafe'], panaderia: ['bakery', 'bread', 'pastry'], pasteleria: ['pastry', 'patisserie', 'bakery', 'cake'],
    bar: ['bar', 'cocktail', 'pub'], vino: ['wine', 'winery', 'vineyard'], cerveza: ['beer', 'brewery', 'brewing'],
    hotel: ['hotel', 'hospitality', 'resort', 'stay', 'inn'], viaje: ['travel', 'tourism', 'trip', 'tour'], turismo: ['tourism', 'travel', 'tour'],
    inmobiliaria: ['real estate', 'property', 'homes', 'apartment', 'residential'], arquitectura: ['architect'], arquitecto: ['architect'],
    interiorismo: ['interior'], interiores: ['interior'], construccion: ['construction', 'builder', 'building'], mueble: ['furniture'],
    gimnasio: ['gym', 'fitness', 'training', 'workout'], fitness: ['fitness', 'gym', 'training'], yoga: ['yoga', 'pilates'], deporte: ['sport', 'athlet', 'fitness'], spa: ['spa', 'wellness', 'massage'],
    belleza: ['beauty', 'salon', 'skincare', 'cosmetic', 'makeup'], peluqueria: ['hair', 'salon', 'barber'], barberia: ['barber', 'hair'], cosmetica: ['cosmetic', 'skincare', 'beauty'],
    moda: ['fashion', 'apparel', 'clothing', 'wear'], ropa: ['clothing', 'apparel', 'fashion', 'wear'], joyeria: ['jewel'], zapatilla: ['shoe', 'sneaker', 'footwear'],
    fotografia: ['photograph'], fotografo: ['photograph'], cine: ['film', 'movie', 'cinema'], pelicula: ['film', 'movie', 'cinema'],
    musica: ['music', 'musician', 'band', 'record', 'album'], musico: ['musician', 'music', 'band'], banda: ['band', 'music'],
    festival: ['festival', 'event'], evento: ['event', 'conference', 'festival'], boda: ['wedding'], conferencia: ['conference', 'summit', 'event'],
    museo: ['museum', 'exhibition', 'gallery'], arte: ['art', 'artist', 'gallery'], artista: ['artist', 'art'],
    escuela: ['school', 'education', 'academy'], universidad: ['university', 'college', 'education'], educacion: ['education', 'course', 'learning', 'school'], curso: ['course', 'learning', 'academy'],
    nino: ['kids', 'children', 'baby'], ong: ['nonprofit', 'charity', 'foundation'], fundacion: ['foundation', 'nonprofit', 'charity'],
    revista: ['magazine', 'editorial', 'journal'], libro: ['book', 'author', 'publish'], editorial: ['editorial', 'publish', 'magazine'], podcast: ['podcast'],
    auto: ['car', 'automotive', 'vehicle'], bici: ['bike', 'bicycle', 'cycling'], flor: ['florist', 'flower'], jardin: ['garden', 'plant', 'landscape'], planta: ['plant', 'garden'],
    energia: ['energy', 'solar', 'power'], agencia: ['agency', 'studio'], estudio: ['studio', 'agency'], portfolio: ['portfolio', 'personal', 'designer'], portafolio: ['portfolio', 'personal'],
    disenador: ['designer', 'portfolio'], startup: ['startup', 'saas'], app: ['app', 'mobile'], ia: ['ai', 'artificial intelligence', 'machine learning'],
    tecnologia: ['tech', 'software', 'technology'], software: ['software', 'saas', 'tech'], banco: ['bank', 'finance', 'fintech'], finanzas: ['finance', 'fintech', 'bank', 'invest'],
    inversion: ['invest', 'venture', 'capital', 'fund'], seguro: ['insurance'], contador: ['accounting', 'tax'], consultora: ['consult'],
    tienda: ['shop', 'store', 'ecommerce'], ecommerce: ['ecommerce', 'shop', 'store'], juego: ['game', 'gaming'], videojuego: ['game', 'gaming'],
    logistica: ['logistics', 'shipping', 'delivery'], fabrica: ['manufactur', 'factory', 'industrial'],
  };
  const SYN_KEYS = Object.keys(SYN);
  const singular = w => (w.length > 4 && /s$/.test(w) ? w.replace(/(es|s)$/, '') : w);

  // Each word becomes a group of terms: the word itself first, then its close relatives
  function parseQuery(q) {
    return norm(q).split(/[\s,]+/).filter(t => t.length > 1).map(w => {
      const key = SYN[w] ? w : SYN[singular(w)] ? singular(w) : null;
      if (key) return { main: [w, SYN[key][0]], alts: SYN[key] };
      const row = SYN_KEYS.find(k => SYN[k].some(a => a === w || (w.length >= 5 && (a.startsWith(w) || w.startsWith(a)))));
      return { main: [w], alts: row ? SYN[row] : [] };
    });
  }
  // Fields are normalized text with a leading space so terms match at the start of a word
  const field = (...parts) => ' ' + norm(parts.flat().join(' '));
  // A related word only counts in the name, categories or rubro tags; in the description it's too weak
  function matchScore(f, groups) {
    let total = 0;
    for (const g of groups) {
      let best = 0;
      const tryTerm = (t, w) => {
        const s = ' ' + t;
        if (f.q.includes(s)) best = Math.max(best, 9 * w);
        if (f.name.includes(s)) best = Math.max(best, 7 * w);
        if (f.cats.includes(s)) best = Math.max(best, 6 * w);
        if (f.desc.includes(s)) best = Math.max(best, 3 * w);
        if (f.extra.includes(s)) best = Math.max(best, 3 * w);
      };
      for (const t of g.main) tryTerm(t, 1);
      for (const t of g.alts) tryTerm(t, 0.6);
      if (best < 3) return 0;
      total += best;
    }
    return total;
  }

  ALL_REFS.forEach(r => {
    r._f = {
      q: '', name: field(r.name, r.rubro), cats: field(arr(r.tags), arr(r.cats), r.rubro),
      // Palette entries carry color names like "claro"; only the hex goes into search so they don't pass as a mood
      desc: field(r.likes, r.dna, r.layout, r.avoid, r.desc), extra: field(arr(r.fonts), arr(r.palette).map(hexOf).filter(Boolean), r.motion, r.stack, r.url, r.atus ? 'atus' : ''),
    };
  });

  /* ---------- state ---------- */
  const S = {
    tab: 'refs', q: '', rubro: null, tag: null, favOnly: false, folder: store.get('folder', null),
    mix: new Set(store.get('mix', [])),
    aspects: store.get('aspects', {}),
    custom: store.get('mixCustom', {}),
    sheet: null, lastFocus: null, pushed: false,
  };

  /* ---------- feedback ---------- */
  let toastT = 0;
  // An optional action ({label, fn}) adds a button, e.g. "Deshacer", and keeps the toast up longer
  function toast(msg, action) {
    const t = $('#toast');
    put(t, msg, action ? h('button', { class: 'toast-act', type: 'button', onclick: () => { clearTimeout(toastT); t.classList.remove('show'); action.fn(); } }, action.label) : null);
    t.classList.toggle('has-act', !!action);
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), action ? 6000 : 2000);
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
  const notice = (title, text) => h('div', { class: 'notice' }, h('h2', null, title), text ? h('p', null, text) : null);
  const chip = (label, pressed, onclick, key) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(!!pressed), 'data-key': key, onclick: () => { onclick(); restoreFocus(key); } }, label);

  /* ---------- prompts ---------- */
  function buildPrompt(r) {
    const L = [`Diseñá una web con la dirección visual de ${r.name}${r.url ? ` (${host(r.url)})` : ''}.`];
    if (r.rubro) L.push(`Rubro de la referencia: ${r.rubro}.`);
    const f = arr(r.fonts); if (f.length) L.push(`Tipografía: ${f.join('; ')}.`);
    const p = arr(r.palette); if (p.length) L.push(`Paleta: ${p.join(', ')}.`);
    if (r.layout) L.push(`Layout: ${r.layout}`);
    if (r.motion) L.push(`Movimiento: ${r.motion}`);
    if (r.likes || r.dna) L.push(`Lo que la hace buena: ${r.likes || r.dna}`);
    if (r.avoid) L.push(`Evitar: ${r.avoid}`);
    L.push('Adaptalo a: [describí tu proyecto acá].');
    return L.join('\n');
  }
  const promptOf = r => (typeof r.prompt === 'string' && r.prompt.trim()) ? r.prompt.trim() : buildPrompt(r);

  /* ---------- tabs + url ---------- */
  const TABS = ['refs', 'discover', 'mix', 'taste'];
  const TAB_HASH = { refs: 'referencias', discover: 'descubrir', mix: 'mezclar', taste: 'gusto' };
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

  /* ---------- references ---------- */
  // Sites starred in Descubrir live in this device's storage and show up as references too.
  // They have no hand-written DNA, so their prompt and mix lines point to the site itself.
  function favRefs() {
    return L.saved.map(s => {
      const name = s.name || s.title, cats = arr(s.cats);
      const r = {
        id: 'fav:' + s.link, fav: true, name, url: s.link, image: s.image || '', source: s.source || '',
        rubro: '', tags: [], cats, desc: s.desc || s.tagline || '',
        prompt: [
          `Diseñá una web con la dirección visual de ${name} (${s.link}).`,
          `La guardé de ${s.source || 'una galería'}${cats.length ? ` (temas: ${cats.join(', ')})` : ''}.`,
          s.desc ? `Cómo es: ${s.desc}` : '',
          'Abrí la web y tomá su tipografía, paleta, layout y movimiento como dirección.',
          'Adaptalo a: [describí tu proyecto acá].',
        ].filter(Boolean).join('\n'),
        // Gallery links point to the gallery's page about the site, so name the site, not the host
        mixText: { type: `la tipografía de ${name}`, color: `los colores de ${name}`, layout: `el layout de ${name}`, motion: `el movimiento de ${name}`, tone: s.desc || `la actitud de ${name}` },
      };
      r._f = { q: '', name: field(name, s.source), cats: field(cats, 'favorito'), desc: field(r.desc), extra: field(s.link) };
      return r;
    });
  }
  // Pages added with "+ Agregar" show up at once on this device. The GitHub issue that opens next
  // makes them permanent: a robot (scripts/add-ref.mjs) screenshots the site, reads its fonts and
  // colors and adds it to data.js; from then on the real reference replaces the local copy.
  const REPO = 'nachoreyes03-prog/inspiracion-atus';
  // Sites on shared hosts (Behance, Instagram…) are told apart by their path, the rest by host
  const SHARED_HOSTS = /(^|\.)(behance\.net|dribbble\.com|instagram\.com|pinterest\.[a-z.]+|x\.com|twitter\.com|youtube\.com|vimeo\.com|medium\.com|github\.com|notion\.so|awwwards\.com|framer\.com|linkedin\.com)$/;
  const siteKey = u => {
    const hst = host(u).toLowerCase();
    if (!SHARED_HOSTS.test(hst)) return hst;
    try { return hst + new URL(u).pathname.replace(/\/+$/, '').toLowerCase(); } catch { return hst; }
  };
  const refKeys = new Set(ALL_REFS.map(r => r.url && siteKey(r.url)).filter(Boolean));
  let ADDED = store.get('added', []).filter(a => a && safeHref(a.url) && !refKeys.has(siteKey(a.url)));
  store.set('added', ADDED);
  const nameOfHost = hst => { const w = hst.split('.')[0] || hst; return w.charAt(0).toUpperCase() + w.slice(1); };

  /* ---------- uploading: everything that changed on this device, in one GitHub issue ---------- */
  // The robot (scripts/robot.mjs) applies the issue's json block to data.js, so the changes reach
  // every device and Claude. Applying the same block twice changes nothing.
  function pendingChanges() {
    const ch = {};
    const inRefs = link => ALL_REFS.some(r => r.url === link);
    const adds = ADDED.map(a => ({ url: a.url, folders: arr(a.folders) }));
    if (adds.length) ch.adds = adds;
    if (HIDDEN.size) ch.removes = [...HIDDEN];
    const favs = L.saved.filter(s => !inRefs(s.link)).map(s => ({
      link: s.link, name: s.name || s.title, source: s.source || '', image: s.image || '', cats: arr(s.cats).slice(0, 5),
      desc: String(s.desc || s.tagline || '').slice(0, 200), folders: arr(s.folders),
    }));
    if (favs.length) ch.favs = favs;
    const fo = {};
    if (PEND.folderAdds.length) fo.add = PEND.folderAdds.map(f => ({ id: f.id, name: f.name }));
    const ren = Object.entries(PEND.folderRenames).map(([id, name]) => ({ id, name }));
    if (ren.length) fo.rename = ren;
    if (PEND.folderRemoves.length) fo.remove = [...PEND.folderRemoves];
    if (Object.keys(fo).length) ch.folders = fo;
    if (Object.keys(PEND.refs).length) ch.refs = Object.assign({}, PEND.refs);
    return ch;
  }
  const countChanges = ch => arr2(ch.adds).length + arr2(ch.removes).length + arr2(ch.favs).length + Object.keys(ch.refs || {}).length
    + (ch.folders ? arr2(ch.folders.add).length + arr2(ch.folders.rename).length + arr2(ch.folders.remove).length : 0);
  function changeLines(ch) {
    const fn = ids => (ids.length ? ` → ${ids.map(folderName).join(', ')}` : '');
    const refName = id => (ALL_REFS.find(r => r.id === id) || {}).name || id;
    return [
      ...arr2(ch.adds).map(a => `- Agregar ${a.url}${fn(a.folders)}`),
      ...arr2(ch.removes).map(id => `- Sacar ${refName(id)}`),
      ...arr2(ch.favs).map(f => `- Guardar de Descubrir: ${f.name}${fn(f.folders)}`),
      ...(ch.folders ? [
        ...arr2(ch.folders.add).map(f => `- Carpeta nueva: ${f.name}`),
        ...arr2(ch.folders.rename).map(f => `- Renombrar carpeta: ${f.name}`),
        ...arr2(ch.folders.remove).map(id => `- Borrar carpeta: ${(DATA_FOLDERS.find(f => f.id === id) || {}).name || id}`),
      ] : []),
      ...Object.entries(ch.refs || {}).map(([id, list]) => `- ${refName(id)}${fn(list) || ' → sin carpeta'}`),
    ];
  }
  // GitHub refuses very long links: big batches go without descriptions, then in parts
  function issueLink(ch) {
    const n = countChanges(ch);
    const make = (c, lines) => `https://github.com/${REPO}/issues/new?` + new URLSearchParams({
      title: `Cambios en Referencias (${countChanges(c)})`, labels: 'cambios',
      body: 'Cambios desde Inspiración Atus. Tocá Create y el robot los aplica.\n\n' + (lines ? changeLines(c).join('\n') + '\n\n' : '') + '```json\n' + JSON.stringify(c) + '\n```',
    });
    let c = ch, link = make(c, true);
    if (link.length > 7000) link = make(c, false);
    if (link.length > 7000 && c.favs) { c = Object.assign({}, c, { favs: c.favs.map(f => Object.assign({}, f, { desc: '' })) }); link = make(c, false); }
    while (link.length > 7000 && c.favs && c.favs.length > 1) { c = Object.assign({}, c, { favs: c.favs.slice(0, Math.ceil(c.favs.length / 2)) }); link = make(c, false); }
    return { link, partial: countChanges(c) < n };
  }
  function upload() {
    const ch = pendingChanges();
    if (!countChanges(ch)) return;
    const { link, partial } = issueLink(ch);
    window.open(link, '_blank', 'noopener');
    store.set('sent', { sig: JSON.stringify(ch), at: Date.now() });
    renderSync();
    if (partial) toast('Eran muchas: subí una parte. Cuando el robot termine, tocá Subir otra vez.');
  }
  function renderSync() {
    const ch = pendingChanges(), n = countChanges(ch);
    $('#sync').hidden = !n;
    document.body.classList.toggle('has-sync', !!n);
    if (!n) return;
    const sent = store.get('sent', null);
    const waiting = sent && sent.sig === JSON.stringify(ch) && Date.now() - sent.at < 3600e3;
    $('#sync-text').textContent = waiting ? 'Si tocaste Create, en unos minutos está en todos lados' : `${n} ${n === 1 ? 'cambio' : 'cambios'} solo en este dispositivo`;
    $('#sync-go').textContent = waiting ? 'Otra vez' : 'Subir';
  }

  function pendingRefs() {
    return ADDED.map(a => {
      const src = host(a.url), name = nameOfHost(src);
      const r = {
        id: 'add:' + a.url, fav: true, pending: true, name, url: a.url, source: src,
        image: 'https://s.wordpress.com/mshots/v1/' + encodeURIComponent(a.url) + '?w=1440&h=900',
        rubro: '', tags: [], cats: [], desc: '',
        prompt: [`Diseñá una web con la dirección visual de ${name} (${a.url}).`, 'Abrí la web y tomá su tipografía, paleta, layout y movimiento como dirección.', 'Adaptalo a: [describí tu proyecto acá].'].join('\n'),
        mixText: { type: `la tipografía de ${name}`, color: `los colores de ${name}`, layout: `el layout de ${name}`, motion: `el movimiento de ${name}`, tone: `la actitud de ${name}` },
      };
      r._f = { q: '', name: field(name, src), cats: field('nueva'), desc: '', extra: field(a.url) };
      return r;
    });
  }
  // Pulls a link out of whatever was pasted ("mirá esta https://…", "www.site.com", "site.com/x")
  function cleanUrl(text) {
    const s = String(text || '').trim();
    let u = (s.match(/https?:\/\/[^\s<>"']+/i) || [])[0] || (s.match(/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i) || [])[0];
    if (!u) return null;
    u = u.replace(/[.,;:!?)\]]+$/, '');
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    try { const x = new URL(u); if (!x.hostname.includes('.')) return null; x.hash = ''; return x.href; } catch { return null; }
  }
  // Folder chips that toggle; the pressed ones are read back with pickedFolders()
  const folderToggles = (box, on) => put(box, folderList().map(f => h('button', {
    class: 'chip', type: 'button', 'data-id': f.id, 'aria-pressed': String(on.includes(f.id)),
    onclick: e => e.currentTarget.setAttribute('aria-pressed', String(e.currentTarget.getAttribute('aria-pressed') !== 'true')),
  }, f.name)));
  const pickedFolders = box => $$('.chip[aria-pressed="true"]', box).map(b => b.dataset.id);
  function openAdd(prefill) {
    const d = $('#add');
    $('#add-url').value = prefill || '';
    $('#add-err').hidden = true;
    // Adding from inside a folder puts the page in it
    folderToggles($('#add-folders'), S.tab === 'refs' && S.folder ? [S.folder] : []);
    if (typeof d.showModal !== 'function') { const u = window.prompt('Link de la web'); if (u && !addPage(u)) toast('Ese link no parece una web'); return; }
    d.showModal();
    $('#add-url').focus();
  }
  // Returns false when the text isn't a link, so the box can say so
  function addPage(text) {
    const url = cleanUrl(text);
    if (!url) return false;
    const d = $('#add');
    const folders = pickedFolders($('#add-folders'));
    if (d.open) d.close();
    const k = siteKey(url);
    const ref = REFS.find(r => r.url && siteKey(r.url) === k);
    if (ref) {
      // Already there: it only goes into the chosen folders
      if (folders.length) setFoldersOf(ref, [...new Set([...foldersOf(ref), ...folders])]);
      toast(folders.length ? `Ya estaba: la sumé a ${folders.map(folderName).join(', ')}` : 'Ya estaba en Referencias');
      setTab('refs');
      openDetail(ref.id);
      return true;
    }
    const old = ADDED.find(a => siteKey(a.url) === k);
    if (old) old.folders = [...new Set([...arr(old.folders), ...folders])];
    else ADDED = [{ url, at: new Date().toISOString(), folders }, ...ADDED];
    store.set('added', ADDED);
    upload();
    Object.assign(S, { q: '', rubro: null, tag: null, favOnly: false });
    $('#q').value = '';
    setTab('refs');
    render();
    toast('Guardada. En GitHub tocá Create');
    return true;
  }
  // A reference from data.js: hidden here at once, and the issue that opens lets the robot
  // delete it everywhere. Undo only brings it back on this device.
  function removeRef(r) {
    confirmBox(`¿Sacar ${r.name} de Referencias? Después tocá Create en GitHub para sacarla de todos tus dispositivos.`, 'Sí, sacar', () => {
      HIDDEN.add(r.id);
      store.set('removed', [...HIDDEN]);
      syncRefs();
      const wasInMix = S.mix.delete(r.id);
      store.set('mix', [...S.mix]);
      upload();
      if (S.sheet) requestClose();
      render();
      toast('Sacada. En GitHub tocá Create', { label: 'Deshacer', fn: () => {
        HIDDEN.delete(r.id);
        store.set('removed', [...HIDDEN]);
        syncRefs();
        if (wasInMix) { S.mix.add(r.id); store.set('mix', [...S.mix]); }
        render();
      } });
    });
  }
  function removeAdded(url) {
    ADDED = ADDED.filter(a => a.url !== url);
    store.set('added', ADDED);
    S.mix.delete('add:' + url);
    store.set('mix', [...S.mix]);
    render();
    toast('Sacada de Referencias');
  }

  const allRefs = () => [...pendingRefs(), ...REFS, ...favRefs()];
  const findRef = id => allRefs().find(r => r.id === id);

  // A reference's folders: pages added here and ★ sites keep them on themselves until uploaded;
  // references from data.js take this device's pending choice over data.js
  function foldersOf(r) {
    const ok = new Set(folderList().map(f => f.id));
    let list;
    if (r.pending) list = (ADDED.find(a => a.url === r.url) || {}).folders;
    else if (r.fav) list = (L.saved.find(s => s.link === r.url) || {}).folders;
    else list = PEND.refs[r.id] || r.folders;
    return arr(list).filter(id => ok.has(id));
  }
  function setFoldersOf(r, ids) {
    if (r.pending) { const a = ADDED.find(x => x.url === r.url); if (a) { a.folders = ids; store.set('added', ADDED); } }
    else if (r.fav) { const s = L.saved.find(x => x.link === r.url); if (s) { s.folders = ids; store.set('saved', L.saved); } }
    else {
      const base = arr((ALL_REFS.find(x => x.id === r.id) || {}).folders);
      if (sameSet(ids, base)) delete PEND.refs[r.id]; else PEND.refs[r.id] = ids;
      savePend();
    }
    render();
  }

  /* ---------- folders ---------- */
  function renderFolders() {
    const list = folderList();
    if (S.folder && !list.some(f => f.id === S.folder)) S.folder = null;
    const counts = new Map();
    for (const r of allRefs()) for (const id of foldersOf(r)) counts.set(id, (counts.get(id) || 0) + 1);
    const pick = id => () => { S.folder = S.folder === id ? null : id; store.set('folder', S.folder); render(); restoreFocus('folder:' + id); };
    put($('#folders'),
      list.map(f => h('button', { class: 'folder', type: 'button', 'aria-pressed': String(S.folder === f.id), 'data-key': 'folder:' + f.id, onclick: pick(f.id) },
        f.name, h('span', { class: 'c' }, counts.get(f.id) || 0))),
      S.folder ? h('button', { class: 'folder edit', type: 'button', onclick: () => openFolderDlg(S.folder) }, 'Editar') : null,
      h('button', { class: 'folder new', type: 'button', onclick: () => openFolderDlg(null) }, '+ Carpeta'));
  }
  // New folder (id null) or rename/delete one. "then" gets the new folder's id.
  let folderDlg = { id: null, then: null };
  function openFolderDlg(id, then) {
    const f = id ? folderList().find(x => x.id === id) : null;
    folderDlg = { id: f ? f.id : null, then: then || null };
    $('#folder-title').textContent = f ? 'Nombre de la carpeta' : 'Carpeta nueva';
    $('#folder-name').value = f ? f.name : '';
    $('#folder-del').hidden = !f;
    $('#folder-dlg').showModal();
    $('#folder-name').focus();
  }
  function saveFolderDlg() {
    const name = $('#folder-name').value.trim().slice(0, 40);
    if (!name) { $('#folder-name').focus(); return; }
    const { id, then } = folderDlg;
    $('#folder-dlg').close();
    if (id) {
      const added = PEND.folderAdds.find(f => f.id === id);
      const base = DATA_FOLDERS.find(f => f.id === id);
      if (added) added.name = name;
      else if (base && base.name === name) delete PEND.folderRenames[id];
      else PEND.folderRenames[id] = name;
      savePend();
      render();
      return;
    }
    const nid = findFolderByName(name) || createFolder(name);
    if (then) then(nid);
    else { S.folder = nid; store.set('folder', nid); render(); }
  }
  function deleteFolder() {
    const id = folderDlg.id;
    if (!id) return;
    $('#folder-dlg').close();
    confirmBox(`¿Borrar la carpeta ${folderName(id)}? Las webs siguen en Referencias.`, 'Sí, borrar', () => {
      const i = PEND.folderAdds.findIndex(f => f.id === id);
      if (i >= 0) PEND.folderAdds.splice(i, 1);
      else if (!PEND.folderRemoves.includes(id)) PEND.folderRemoves.push(id);
      delete PEND.folderRenames[id];
      savePend();
      if (S.folder === id) { S.folder = null; store.set('folder', null); }
      render();
      toast('Carpeta borrada');
    });
  }
  // The detail's folder chips: tap to put the reference in a folder or take it out
  function detailFolders(r) {
    const mine = foldersOf(r);
    return h('div', { class: 'd-folders' },
      h('span', { class: 'lbl' }, 'Carpetas'),
      folderList().map(f => h('button', {
        class: 'chip', type: 'button', 'aria-pressed': String(mine.includes(f.id)), 'data-key': 'dfold:' + f.id,
        onclick: () => {
          const now = foldersOf(r);
          setFoldersOf(r, now.includes(f.id) ? now.filter(x => x !== f.id) : [...now, f.id]);
          restoreFocus('dfold:' + f.id);
        },
      }, f.name)),
      h('button', { class: 'chip', type: 'button', onclick: () => openFolderDlg(null, id => setFoldersOf(r, [...foldersOf(r), id])) }, '+ Nueva'));
  }

  function render() {
    renderCounts();
    renderFolders();
    renderFilters();
    renderGrid();
    renderMix();
    renderSync();
    if (S.sheet && S.sheet.mode === 'detail') renderDetail();
  }

  function renderCounts() {
    $('#n-refs').textContent = pad(REFS.length + L.saved.length + ADDED.length);
    $('#n-mix').textContent = S.mix.size ? pad(S.mix.size) : '';
    const fresh = liveAll().filter(i => Date.now() - i._t < 7 * 864e5).length;
    $('#n-live').textContent = fresh ? fmtN(fresh) : '';
  }

  function renderFilters() {
    const box = $('#filters');
    if (!REFS.length) { put(box); return; }
    const rubros = [...new Set(REFS.map(r => r.rubro).filter(Boolean))].sort((x, y) => x.localeCompare(y, 'es'));
    const counts = new Map();
    for (const r of REFS) for (const t of arr(r.tags)) counts.set(t, (counts.get(t) || 0) + 1);
    const tags = [...counts].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0], 'es')).slice(0, 14).map(([t]) => t);
    const savedN = L.saved.length + REFS.filter(r => r.gallery).length;
    put(box,
      chip('Todas', !S.favOnly && !S.rubro && !S.tag, () => { S.favOnly = false; S.rubro = null; S.tag = null; render(); }, 'f:all'),
      savedN ? chip(`★ Guardadas ${savedN}`, S.favOnly, () => { S.favOnly = !S.favOnly; render(); }, 'f:fav') : null,
      rubros.map(rb => chip(rb, S.rubro === rb, () => { S.rubro = S.rubro === rb ? null : rb; render(); }, 'f:r:' + rb)),
      h('span', { class: 'sep', 'aria-hidden': 'true' }),
      tags.map(t => chip('#' + t, S.tag === t, () => { S.tag = S.tag === t ? null : t; render(); }, 'f:t:' + t)));
  }

  function visibleRefs() {
    let list = allRefs().filter(r => (!S.folder || foldersOf(r).includes(S.folder)) && (!S.favOnly || (r.fav && !r.pending) || r.gallery) && (!S.rubro || r.rubro === S.rubro) && (!S.tag || arr(r.tags).includes(S.tag)));
    const groups = parseQuery(S.q);
    if (!groups.length) return list;
    return list.map(r => [r, matchScore(r._f, groups)]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).map(([r]) => r);
  }

  function placeholder(name, palette) {
    const hexes = arr(palette).map(hexOf).filter(Boolean);
    const el = h('span', { class: 'ph' }, h('span', { class: 'ph-name' }, name || ''));
    if (hexes[0]) el.style.background = hexes[0];
    if (hexes[1]) el.style.color = hexes[1];
    return el;
  }

  const shotsOf = r => (r.fav ? (r.image ? [r.image] : []) : arr(r.shots));
  // mshots answers with a 400×300 "generating" picture until the real screenshot is ready
  function retryShot(img, n) {
    img.addEventListener('load', () => {
      if (img.naturalWidth !== 400 || img.naturalHeight !== 300 || n >= 8) return;
      setTimeout(() => { retryShot(img, n + 1); img.src = img.src.replace(/&r=\d+$/, '') + '&r=' + (n + 1); }, 4000);
    }, { once: true });
  }
  function refCard(r) {
    const shots = shotsOf(r);
    let imgA = null, imgB = null;
    if (shots[0]) {
      imgA = h('img', { src: imgSrc(shots[0]), alt: '', loading: 'lazy', decoding: 'async', referrerpolicy: r.fav || r.gallery ? 'no-referrer' : null });
      imgA.addEventListener('error', () => imgA.replaceWith(placeholder(r.name, r.palette)), { once: true });
      if (r.pending) retryShot(imgA, 0);
    }
    if (shots[1]) {
      imgB = h('img', { class: 'alt', src: imgSrc(shots[1]), alt: '', loading: 'lazy', decoding: 'async' });
      imgB.addEventListener('error', () => imgB.remove(), { once: true });
    }
    const inMix = S.mix.has(r.id);
    const hexes = arr(r.palette).map(hexOf).filter(Boolean).slice(0, 6);
    const fonts = arr(r.fonts).map(fontName).filter(Boolean);
    return h('article', { class: 'card' },
      h('button', { class: 'shot', type: 'button', 'aria-label': 'Ver ' + r.name, 'data-key': 'card:' + r.id, onclick: e => openDetail(r.id, e.currentTarget) },
        imgA || placeholder(r.name, r.palette), imgB, r.atus ? h('span', { class: 'badge' }, 'Atus') : r.pending ? h('span', { class: 'badge' }, 'Nueva') : r.fav ? h('span', { class: 'badge' }, '★') : null),
      h('div', { class: 'card-head' }, h('h3', null, r.name), r.url ? h('span', { class: 'dom' }, r.fav || r.gallery ? r.source || host(r.url) : host(r.url)) : null),
      (hexes.length || fonts.length) ? h('div', { class: 'card-dna' },
        hexes.length ? h('span', { class: 'sws' }, hexes.map(x => h('i', { style: { background: x } }))) : null,
        fonts.length ? h('span', { class: 'fonts' }, fonts.join(' · ')) : null) : null,
      h('div', { class: 'card-actions', 'data-pour': 'contain' },
        h('button', { class: 'btn sm', type: 'button', 'data-tip': 'Para pegarle a Claude', onclick: () => copy(promptOf(r), 'Prompt copiado') }, 'Copiar prompt'),
        h('button', { class: 'btn sm ' + (inMix ? 'lime' : 'ghost'), type: 'button', 'aria-pressed': String(inMix), 'data-key': 'card-mix:' + r.id, 'data-tip': inMix ? 'Sacar de Mezclar' : 'Sumar a Mezclar', onclick: () => toggleMix(r.id, 'card-mix:' + r.id) }, inMix ? '✓ Mezcla' : '+ Mezcla')));
  }

  const cardCache = new Map();
  function getCard(r) {
    const sig = String(S.mix.has(r.id));
    const c = cardCache.get(r.id);
    if (c && c.sig === sig) return c.el;
    const el = refCard(r);
    cardCache.set(r.id, { sig, el });
    return el;
  }
  function reconcile(parent, nodes) {
    nodes.forEach((n, i) => { if (parent.children[i] !== n) parent.insertBefore(n, parent.children[i] || null); });
    while (parent.children.length > nodes.length) parent.lastElementChild.remove();
  }

  function renderGrid() {
    const grid = $('#grid');
    if (!DATA) { put(grid, notice('No encontré data.js', 'Tiene que estar al lado de index.html.')); return; }
    const list = visibleRefs();
    if (!list.length) put(grid, S.folder && !S.q && !S.rubro && !S.tag && !S.favOnly
      ? notice(`${folderName(S.folder)} está vacía`, 'Guardá webs acá con la ★ de Descubrir, con + Agregar o desde la ficha de cada referencia.')
      : notice(S.q ? `Ninguna referencia con “${S.q}”` : 'Ninguna con esos filtros', null));
    else {
      if (grid.querySelector('.notice')) put(grid);
      reconcile(grid, list.map(getCard));
    }
    renderRefLive();
  }

  // Under your references, the best sites from the galleries for the same search
  function renderRefLive() {
    const box = $('#ref-live');
    const q = S.q.trim();
    if (q.length < 3) { box.hidden = true; return; }
    if (L.status !== 'ready') { loadLive(); box.hidden = true; return; }
    const hits = rankLive(liveAll(), parseQuery(q));
    box.hidden = false;
    put(box,
      h('div', { class: 'also-head' },
        h('h2', null, hits.length ? `${fmtN(hits.length)} webs de galerías con “${q}”` : `Nada en las galerías con “${q}”`),
        hits.length ? h('button', { class: 'btn sm', type: 'button', 'data-tip': 'Abrir en Descubrir', onclick: () => { $('#dq').value = q; store.set('dq', q); L.shown = PAGE; setTab('discover'); } }, 'Ver todas') : null),
      hits.length ? h('div', { class: 'grid' }, hits.slice(0, 8).map(getLiveCard)) : null);
  }

  function toggleMix(id, key) {
    const r = findRef(id);
    if (S.mix.has(id)) S.mix.delete(id); else S.mix.add(id);
    store.set('mix', [...S.mix]);
    render();
    restoreFocus(key);
    toast(S.mix.has(id) ? `${r.name} en la mezcla` : `${r.name} fuera de la mezcla`);
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
  // Closing goes through history when the sheet pushed an entry, so the phone's back button also closes it
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
    if (!S.sheet) S.lastFocus = document.activeElement;
    S.sheet = { mode: 'copy' };
    setSheetHead('Copiar a mano', false);
    const ta = h('textarea', { class: 'in mono', rows: 16, readOnly: true, value: text });
    put($('#sheet-body'), h('div', { class: 'detail' }, ta));
    showSheet();
    setTimeout(() => { ta.focus(); ta.select(); }, 60);
  }

  const imgCache = new Map();
  function detailImg(path, alt) {
    let el = imgCache.get(path);
    if (!el) {
      el = h('img', { src: imgSrc(path), alt, decoding: 'async', referrerpolicy: /^https?:/i.test(path) ? 'no-referrer' : null });
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

  function dnaList(r) {
    const rows = [];
    if (r.pending) return h('dl', { class: 'dl' }, h('dt', null, 'Estado'), h('dd', null, 'Se está sumando. Cuando el robot termina aparece con captura, tipografías y colores en todos tus dispositivos.'));
    if (r.fav || r.gallery) {
      if (r.source) rows.push(['Galería', r.source]);
      if (arr(r.cats).length) rows.push(['Temas', arr(r.cats).join(', ')]);
      if (r.desc) rows.push(['Cómo es', r.desc]);
      return rows.length ? h('dl', { class: 'dl' }, rows.map(([k, v]) => [h('dt', null, k), h('dd', null, v)])) : null;
    }
    if (r.dna) rows.push(['Por qué funciona', r.dna]);
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
    const r = findRef(S.sheet.id);
    if (!r) { requestClose(); return; }
    const list = visibleRefs();
    const pos = list.findIndex(x => x.id === r.id);
    setSheetHead(pos >= 0 ? `${pad(pos + 1)} / ${pad(list.length)}` : '', pos >= 0 && list.length > 1);
    const shots = shotsOf(r);
    const inMix = S.mix.has(r.id);
    const tags = arr(r.tags);
    put($('#sheet-body'), h('article', { class: 'detail' },
      shots.length ? h('div', { class: 'd-shots' }, detailImg(shots[0], `Captura de ${r.name}`)) : null,
      h('div', { class: 'd-head' },
        h('h2', null, r.name),
        h('div', { class: 'd-sub' },
          safeHref(r.url) ? h('a', { href: r.url, target: '_blank', rel: 'noopener noreferrer' }, host(r.url) + ' ↗') : null,
          r.rubro ? h('span', null, r.rubro) : null,
          r.atus ? h('span', { class: 'badge inline' }, 'Para Atus') : null),
        h('div', { class: 'd-actions', 'data-pour': 'contain' },
          h('button', { class: 'btn solid', type: 'button', 'data-tip': 'Para pegarle a Claude', onclick: () => copy(promptOf(r), 'Prompt copiado') }, 'Copiar prompt'),
          h('button', { class: 'btn ' + (inMix ? 'lime' : ''), type: 'button', 'aria-pressed': String(inMix), 'data-key': 'd-mix', 'data-tip': inMix ? 'Sacar de Mezclar' : 'Sumar a Mezclar', onclick: () => toggleMix(r.id, 'd-mix') }, inMix ? '✓ Mezcla' : '+ Mezcla'),
          safeHref(r.url) ? h('a', { class: 'btn ghost', href: r.url, target: '_blank', rel: 'noopener noreferrer', 'data-tip': 'Ver la web en vivo' }, 'Abrir ↗') : null,
          r.pending ? h('button', { class: 'btn ghost', type: 'button', 'data-tip': 'Sacar de Referencias', onclick: () => removeAdded(r.url) }, 'Sacar') : null,
          r.fav && !r.pending ? h('button', { class: 'btn ghost', type: 'button', 'data-tip': 'Sacar de guardadas', onclick: () => { toggleSave({ link: r.url }); } }, 'Sacar') : null,
          !r.fav ? h('button', { class: 'btn ghost', type: 'button', 'data-tip': 'De todos tus dispositivos', onclick: () => removeRef(r) }, 'Sacar') : null),
        detailFolders(r),
        tags.length ? h('div', { class: 'tags' }, tags.map(t => h('button', {
          class: 'tag', type: 'button',
          onclick: () => { S.tag = t; S.rubro = null; S.lastFocus = null; requestClose(); setTab('refs'); render(); },
        }, '#' + t))) : null),
      r.likes ? h('p', { class: 'quote' }, r.likes) : null,
      r.avoid ? h('p', { class: 'prose' }, 'Evitar: ' + r.avoid) : null,
      dnaList(r),
      h('details', { class: 'fold' }, h('summary', null, 'Ver prompt'), h('pre', { class: 'code' }, promptOf(r))),
      shots.length > 1 ? h('div', { class: 'd-shots' }, shots.slice(1).map((p, i) => detailImg(p, `Captura ${i + 2} de ${r.name}`))) : null));
  }

  /* ---------- mix ---------- */
  const ASPECTS = [
    { k: 'type', label: 'Tipografía', hint: 'Poppins 700 en mayúscula…', get: r => r.mixText ? r.mixText.type : arr(r.fonts).join('; ') },
    { k: 'color', label: 'Paleta', hint: 'negro, blanco y un lima #C6F432…', get: r => r.mixText ? r.mixText.color : arr(r.palette).join(', ') },
    { k: 'layout', label: 'Layout', hint: 'hero con foto a sangre…', get: r => r.mixText ? r.mixText.layout : r.layout || '' },
    { k: 'motion', label: 'Movimiento', hint: 'scroll suave, texto por palabra…', get: r => r.mixText ? r.mixText.motion : r.motion || '' },
    { k: 'tone', label: 'Actitud', hint: 'sobria pero con humor…', get: r => r.mixText ? r.mixText.tone : r.likes || r.dna || '' },
    { k: 'extra', label: 'Otras cosas', hint: 'secciones, contenido, qué evitar…', get: () => '' },
  ];
  const mixRefs = () => allRefs().filter(r => S.mix.has(r.id));
  const customOf = k => String(S.custom[k] || '').trim();
  function aspectPick(a, i, sel) {
    const cur = S.aspects[a.k];
    if (cur === 'none' || a.k === 'extra') return null;
    // What you write replaces the reference, unless you picked one on purpose
    if (customOf(a.k) && !cur) return null;
    const found = sel.find(r => r.id === cur && a.get(r));
    if (found) return found;
    for (let j = 0; j < sel.length; j++) { const r = sel[(i + j) % sel.length]; if (a.get(r)) return r; }
    return null;
  }

  function renderMix() {
    const sel = mixRefs();
    // Picker with a preview of each site, so you can tell them apart
    put($('#mix-picker'), allRefs().map(r => {
      const on = S.mix.has(r.id);
      const shot = shotsOf(r)[0];
      const img = shot ? h('img', { src: imgSrc(shot), alt: '', loading: 'lazy', decoding: 'async', referrerpolicy: r.fav || r.gallery ? 'no-referrer' : null }) : placeholder(r.name, r.palette);
      return h('button', { type: 'button', class: 'pick', 'aria-pressed': String(on), 'data-key': 'mix:' + r.id, title: r.name, onclick: () => toggleMix(r.id, 'mix:' + r.id) },
        h('span', { class: 'pick-img' }, img), h('span', { class: 'pick-name' }, (r.fav && !r.pending ? '★ ' : '') + r.name));
    }));
    // Each aspect: pick a reference and/or write anything
    put($('#mix-aspects'), ASPECTS.map((a, i) => {
      const pick = aspectPick(a, i, sel);
      let select = null;
      if (sel.length && a.k !== 'extra') {
        select = h('select', { class: 'in', id: 'mix-' + a.k, 'aria-label': a.label + ': referencia' },
          sel.map(r => h('option', { value: r.id, disabled: !a.get(r) }, r.name)),
          h('option', { value: 'none' }, '—'));
        select.value = pick ? pick.id : 'none';
        select.addEventListener('change', () => { S.aspects[a.k] = select.value; store.set('aspects', S.aspects); renderMixOut(); });
      }
      const input = h('input', { class: 'in', id: 'mix-txt-' + a.k, autocomplete: 'off', value: S.custom[a.k] || '', placeholder: (select ? 'o escribí: ' : '') + a.hint, 'aria-label': a.label });
      input.addEventListener('input', () => {
        S.custom[a.k] = input.value;
        store.set('mixCustom', S.custom);
        // Writing takes over the auto-picked reference; a reference you chose on purpose stays
        if (select && !S.aspects[a.k]) { const p = aspectPick(a, i, sel); select.value = p ? p.id : 'none'; }
        renderMixOut();
      });
      return h('div', { class: 'aspect' },
        h('label', { for: input.id }, a.label),
        h('div', { class: 'ctl' }, select ? h('div', { class: 'sel' }, select) : null, input));
    }));
    renderMixOut();
  }

  function mixPrompt() {
    const sel = mixRefs();
    const what = $('#mix-what').value.trim(), useTaste = $('#mix-taste').checked;
    const lines = [];
    ASPECTS.forEach((a, i) => {
      const r = aspectPick(a, i, sel);
      const mine = customOf(a.k);
      if (r) lines.push(`- ${a.label}, de ${r.name}${r.url ? ` (${r.fav ? r.url : host(r.url)})` : ''}: ${a.get(r)}${mine ? `. Además: ${mine}` : ''}`);
      else if (mine) lines.push(`- ${a.label}: ${mine}`);
    });
    if (!sel.length && !lines.length) return '';
    const L = [`Diseñá ${what || '[qué vas a diseñar]'}.`, '',
      sel.length > 1 ? 'Mezclá estas referencias tomando algo concreto de cada una:' : sel.length ? 'Usá esta referencia como dirección visual:' : 'Dirección visual:',
      ...lines];
    const avoid = [...sel.map(r => r.avoid).filter(Boolean), ...(useTaste && TASTE ? arr(TASTE.avoid) : [])];
    if (avoid.length) L.push('', 'Evitar:', ...avoid.map(x => '- ' + x));
    if (useTaste && TASTE && TASTE.brief) L.push('', 'Mi gusto en general (Atus):', String(TASTE.brief).trim());
    L.push('', 'Antes de escribir código, resumí en 5 líneas la dirección: tipografías, colores en hex, grilla, movimiento y el detalle que la va a hacer memorable. Que no parezca una plantilla.');
    return L.join('\n');
  }
  function renderMixOut() {
    const text = mixPrompt(), out = $('#mix-out');
    out.textContent = text || 'Tocá webs o escribí en los campos.';
    out.classList.toggle('muted', !text);
    $('#mix-copy').disabled = !text;
    $('#mix-reset').disabled = !S.mix.size && !Object.values(S.custom).some(v => String(v || '').trim()) && !$('#mix-what').value.trim();
  }

  // Clears webs, choices and everything written, with a way back
  function saveMix() {
    store.set('mix', [...S.mix]);
    store.set('aspects', S.aspects);
    store.set('mixCustom', S.custom);
    store.set('mixWhat', $('#mix-what').value);
  }
  function resetMix() {
    confirmBox('¿Seguro que querés resetear? Se deseleccionan las webs y se borra todo lo escrito.', 'Sí, resetear', () => {
      S.mix = new Set();
      S.aspects = {};
      S.custom = {};
      $('#mix-what').value = '';
      $('#mix-taste').checked = true;
      store.set('mixTaste', true);
      saveMix();
      render();
      window.scrollTo(0, 0);
      toast('Mezcla reseteada');
    });
  }

  // Small yes/no dialog; falls back to the browser's confirm() where <dialog> isn't supported
  function confirmBox(text, yesLabel, onYes) {
    const d = $('#confirm');
    if (!d || typeof d.showModal !== 'function') { if (window.confirm(text)) onYes(); return; }
    $('#confirm-text').textContent = text;
    $('#confirm-yes').textContent = yesLabel;
    $('#confirm-yes').onclick = () => { d.close(); onYes(); };
    $('#confirm-no').onclick = () => d.close();
    d.showModal();
    $('#confirm-no').focus();
  }

  /* ---------- taste ---------- */
  function tagBars() {
    const n = REFS.length;
    const m = new Map();
    for (const r of REFS) for (const t of arr(r.tags)) m.set(t, (m.get(t) || 0) + 1);
    const top = [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')).slice(0, 10);
    return h('div', { class: 'bars' }, top.map(([t, c]) => h('div', { class: 'bar' },
      h('span', { class: 'k' }, t),
      h('span', { class: 'track' }, h('span', { class: 'fill', style: { width: (c / n * 100).toFixed(1) + '%' } })),
      h('span', { class: 'v' }, c + '/' + n))));
  }
  function renderTaste() {
    const t = TASTE;
    if (!t) { put($('#taste-body'), notice('Todavía no hay perfil de gusto', null)); return; }
    put($('#taste-body'),
      h('p', { class: 'taste-summary' }, t.summary || ''),
      t.brief ? h('div', { class: 'd-actions', 'data-pour': 'contain' }, h('button', { class: 'btn solid', type: 'button', 'data-tip': 'Pegalo antes de pedir diseños', onclick: () => copy(String(t.brief), 'Brief copiado') }, 'Copiar brief de gusto')) : null,
      h('div', { class: 'taste-cols' },
        h('div', null, h('h2', null, 'Se repite'), h('ul', { class: 'rules' }, arr(t.rules).map(x => h('li', null, x)))),
        h('div', null, h('h2', null, 'Evitás'), h('ul', { class: 'rules' }, arr(t.avoid).map(x => h('li', null, x)))),
        h('div', null, h('h2', null, 'Tags'), tagBars())),
      t.brief ? h('details', { class: 'fold' }, h('summary', null, 'Ver brief'), h('pre', { class: 'code' }, String(t.brief))) : null);
  }

  /* ---------- discover: gallery search + live archive ---------- */
  // Galleries are English-indexed: Spanish rubros are translated with SYN before building the link
  const toEnglish = q => parseQuery(q).map(g => (SYN[norm(g.main[0])] || SYN[singular(norm(g.main[0]))] ? g.main[1] : g.main[0])).join(' ');
  const web = q => q ? (/\b(web|site|landing|ui)/i.test(q) ? q : q + ' website') : 'website design';
  const enc = encodeURIComponent;
  const GALLERIES = [
    { name: 'Pinterest', url: q => 'https://ar.pinterest.com/search/pins/?q=' + enc(web(q)) },
    { name: 'Awwwards', url: q => q ? 'https://www.awwwards.com/websites/?text=' + enc(q) : 'https://www.awwwards.com/websites/' },
    { name: 'Savee', url: q => 'https://savee.com/search/?q=' + enc(q || 'website') },
    { name: 'Behance', url: q => 'https://www.behance.net/search/projects/' + enc(web(q)) },
    { name: 'CSS Design Awards', url: q => q ? 'https://www.cssdesignawards.com/search?q=' + enc(q) : 'https://www.cssdesignawards.com/website-gallery' },
    { name: 'Land-book', url: q => q ? 'https://land-book.com/?search=' + enc(q) : 'https://land-book.com/' },
    { name: 'Lapa Ninja', url: q => q ? 'https://www.lapa.ninja/search/?q=' + enc(q) : 'https://www.lapa.ninja/' },
    { name: 'One Page Love', url: q => q ? 'https://onepagelove.com/?s=' + enc(q) : 'https://onepagelove.com/' },
    { name: 'Minimal Gallery', url: q => q ? 'https://minimal.gallery/?s=' + enc(q) : 'https://minimal.gallery/' },
    { name: 'SiteInspire', url: q => q ? 'https://www.siteinspire.com/websites?search=' + enc(q) : 'https://www.siteinspire.com/' },
    { name: 'Dribbble', url: q => 'https://dribbble.com/search/' + enc(web(q)) },
    { name: 'Fonts In Use', url: q => q ? 'https://fontsinuse.com/search?terms=' + enc(q) : 'https://fontsinuse.com/' },
    { name: '21st.dev', url: q => q ? 'https://21st.dev/community/components/s/' + enc(q) : 'https://21st.dev/' },
    { name: 'ecomm.design', url: q => q ? 'https://ecomm.design/?s=' + enc(q) : 'https://ecomm.design/' },
    { name: 'Google', url: q => 'https://www.google.com/search?tbm=isch&q=' + enc(web(q)) },
  ];
  const IDEAS = ['dentista', 'restaurante', 'arquitectura', 'portfolio', 'hotel', 'moda', 'inmobiliaria', 'gimnasio', 'café', 'música', 'estudio', 'fotografía', 'abogado', 'belleza'];
  // Words from the taste profile that flag a site "Para vos" (feeds are in English)
  const FOR_YOU = [['portfolio', 3], ['architect', 3], ['interior', 3], ['typograph', 3], ['big type', 3], ['swiss', 3],
    ['studio', 2], ['minimal', 2], ['dark', 2], ['black', 2], ['monochrom', 2], ['editorial', 2], ['grid', 2], ['photograph', 2],
    ['agency', 2], ['brutal', 2], ['grain', 2], ['music', 2], ['retro', 2], ['interactive', 1], ['type', 1], ['museum', 1], ['gallery', 1], ['fashion', 1], ['creative', 1]];
  const SOURCE_BOOST = { 'The FWA': 2, 'CSS Winner': 1.5, 'SiteInspire': 1.5, 'Minimal Gallery': 1.5, 'Typewolf': 1.5, 'One Page Love': 1, 'Mindsparkle': 1, 'Behance': 0.3 };
  const PAGE = 24;

  const L = {
    status: 'idle', // idle | loading | ready | error
    filter: 'all', // all | foryou | saved
    source: null, cat: null,
    mode: store.get('liveMode', 'new'), // new | random
    rank: null, shown: PAGE, visible: [],
    seen: new Set(store.get('seen', [])),
    saved: store.get('saved', []),
    clearConfirm: false, rendered: false,
  };

  // ★ sites the robot already put in data.js leave this device's list
  L.saved = L.saved.filter(s => s && s.link && !ALL_REFS.some(r => r.url === s.link));
  store.set('saved', L.saved);
  const isSaved = link => L.saved.some(s => s.link === link) || REFS.some(r => r.url === link);

  const liveData = () => window.ATUS_LIVE || null;
  let allCache = [], allFrom = null;
  // Items are prepared once per load: search fields, taste score and timestamp
  function liveAll() {
    const D = liveData();
    if (!D || !Array.isArray(D.items)) return [];
    if (allFrom === D.items) return allCache;
    allFrom = D.items;
    // The same site can come from two galleries: keep the first one by name. Skip articles that aren't sites.
    const names = new Set();
    allCache = D.items.filter(i => {
      if (!i || !safeHref(i.link) || !i.title || /^(article|template review|interview)\b/i.test(i.title)) return false;
      const key = norm(i.name || i.title).replace(/[^a-z0-9]/g, '');
      if (names.has(key)) return false;
      names.add(key);
      return true;
    }).map(i => {
      const f = { q: field(arr(i.q)), name: field(i.name, i.title, i.tagline), cats: field(arr(i.cats)), desc: field(i.desc), extra: field(i.source) };
      const all = f.q + f.name + f.cats + f.desc;
      return Object.assign({}, i, { _f: f, _score: FOR_YOU.reduce((n, [k, w]) => n + (all.includes(k) ? w : 0), 0), _t: Date.parse(i.date) || 0 });
    });
    return allCache;
  }
  // Best first: how well it matches, then the gallery's curation, your taste and how recent it is
  function rankLive(list, groups) {
    const now = Date.now();
    return list.map(i => {
      const m = matchScore(i._f, groups);
      if (!m) return null;
      const fresh = Math.max(0, 1 - (now - i._t) / (365 * 864e5));
      return [i, m + (SOURCE_BOOST[i.source] || 1) + i._score * 0.2 + fresh];
    }).filter(Boolean).sort((a, b) => b[1] - a[1]).map(([i]) => i);
  }

  // live.js can be a couple of MB, so it loads only when it's needed
  function loadLive(force) {
    if (L.status === 'loading' || (L.status === 'ready' && !force)) return;
    L.status = 'loading';
    renderLive();
    const s = document.createElement('script');
    s.src = 'live.js?v=' + Math.floor(Date.now() / 600000);
    s.onload = () => { s.remove(); L.status = 'ready'; renderCounts(); renderLive(); renderRefLive(); };
    s.onerror = () => { s.remove(); L.status = 'error'; renderLive(); };
    document.body.append(s);
  }

  function renderDiscover() {
    L.rendered = true;
    renderGalleries();
    renderLive();
    loadLive();
  }

  function renderGalleries() {
    const q = $('#dq').value.trim();
    const en = q ? toEnglish(q) : '';
    put($('#d-ideas'),
      IDEAS.map(w => chip(w, norm(q) === norm(w), () => setQuery(norm(q) === norm(w) ? '' : w), 'idea:' + w)),
      h('button', { class: 'btn sm', type: 'button', 'data-key': 'idea:random', onclick: () => {
        const pool = IDEAS.filter(w => norm(w) !== norm(q));
        setQuery(pool[Math.floor(Math.random() * pool.length)]);
        restoreFocus('idea:random');
      } }, 'Sorprendeme'));
    put($('#d-links'),
      h('span', { class: 'lbl' }, en ? `“${en}” en` : 'Ir a'),
      GALLERIES.map(g => h('a', { class: 'chip link', href: g.url(en), target: '_blank', rel: 'noopener noreferrer' }, g.name, ' ↗')));
  }

  function setQuery(q) {
    $('#dq').value = q;
    store.set('dq', q);
    L.shown = PAGE;
    renderGalleries();
    renderLive();
  }

  // Random order puts sites you haven't seen first, so every batch brings new ones
  function newRank() {
    L.rank = new Map(liveAll().map(i => [i.link, (L.seen.has(i.link) ? 1 : 0) + Math.random()]));
  }

  function liveList() {
    const all = liveAll();
    let list;
    if (L.filter === 'saved') {
      list = L.saved.map(s => all.find(i => i.link === s.link)
        || Object.assign({ _f: { q: '', name: field(s.title, s.name), cats: '', desc: '', extra: field(s.source) }, _score: 0, _t: Date.parse(s.date) || 0, cats: [] }, s));
    } else list = all;
    if (L.source) list = list.filter(i => i.source === L.source);
    if (L.cat) { const c = norm(L.cat); list = list.filter(i => arr(i.cats).some(x => norm(x) === c)); }
    if (L.filter === 'foryou') list = list.filter(i => i._score >= 3);
    const groups = parseQuery($('#dq').value);
    if (groups.length) {
      // Best matches first, but the ones you skipped with "Otra tanda" go last
      const ranked = rankLive(list, groups);
      return [...ranked.filter(i => !L.seen.has(i.link)), ...ranked.filter(i => L.seen.has(i.link))];
    }
    if (L.filter === 'saved') return list;
    if (L.mode === 'random') {
      if (!L.rank) newRank();
      return [...list].sort((a, b) => (L.rank.get(a.link) ?? 2) - (L.rank.get(b.link) ?? 2));
    }
    if (L.filter === 'foryou') return [...list].sort((a, b) => b._score - a._score || b._t - a._t);
    return [...list].sort((a, b) => b._t - a._t);
  }

  function liveCard(it) {
    const title = it.name || it.title;
    let img = null;
    if (safeHref(it.image)) {
      img = h('img', { src: it.image, alt: '', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
      img.addEventListener('error', () => img.replaceWith(placeholder(title)), { once: true });
    }
    const saved = isSaved(it.link);
    return h('article', { class: 'card live' },
      h('div', { class: 'shot-wrap', 'data-pour': 'below contain' },
        h('a', { class: 'shot', href: it.link, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `Ver ${title}` },
          img || placeholder(title), (it._score || 0) >= 5 ? h('span', { class: 'badge' }, 'Para vos') : null),
        h('button', { class: 'save' + (saved ? ' on' : ''), type: 'button', 'aria-pressed': String(saved), 'aria-label': saved ? 'Sacar de guardadas' : 'Guardar', 'data-key': 'save:' + it.link, 'data-tip': saved ? 'Sacar de Referencias' : 'Guardar en Referencias', onclick: () => toggleSave(it) }, saved ? '★' : '☆')),
      h('div', { class: 'card-head' },
        h('a', { class: 'title', href: it.link, target: '_blank', rel: 'noopener noreferrer' }, title),
        h('span', { class: 'dom' }, it.source)));
  }

  const liveCache = new Map();
  function getLiveCard(it) {
    const sig = String(isSaved(it.link));
    const c = liveCache.get(it.link);
    if (c && c.sig === sig) return c.el;
    const el = liveCard(it);
    liveCache.set(it.link, { sig, el });
    return el;
  }

  function renderLiveFilters(all) {
    const bySource = new Map(), byCat = new Map();
    for (const i of all) {
      bySource.set(i.source, (bySource.get(i.source) || 0) + 1);
      for (const c of arr(i.cats)) byCat.set(c, (byCat.get(c) || 0) + 1);
    }
    const cats = [...byCat].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')).slice(0, 20).map(([c]) => c);
    if (L.cat && !cats.includes(L.cat)) cats.unshift(L.cat);
    const set = fn => () => { fn(); L.shown = PAGE; renderLive(); };
    put($('#live-filters'),
      h('div', { class: 'frow scroll-row' },
        chip('Todas', L.filter === 'all', set(() => { L.filter = 'all'; }), 'live:all'),
        chip('Para vos', L.filter === 'foryou', set(() => { L.filter = 'foryou'; }), 'live:foryou'),
        chip(`★ ${L.saved.length}`, L.filter === 'saved', set(() => { L.filter = 'saved'; }), 'live:saved'),
        h('span', { class: 'sep', 'aria-hidden': 'true' }),
        chip('Nuevas', L.mode === 'new', set(() => { L.mode = 'new'; store.set('liveMode', 'new'); }), 'live:new'),
        chip('Al azar', L.mode === 'random', set(() => { L.mode = 'random'; store.set('liveMode', 'random'); newRank(); }), 'live:random'),
        h('span', { class: 'sep', 'aria-hidden': 'true' }),
        [...bySource].sort((a, b) => b[1] - a[1]).map(([name]) => chip(name, L.source === name, set(() => { L.source = L.source === name ? null : name; }), 'live:src:' + name))),
      cats.length ? h('div', { class: 'frow scroll-row' },
        cats.map(c => chip('#' + c, L.cat === c, set(() => { L.cat = L.cat === c ? null : c; }), 'live:cat:' + c))) : null);
  }

  function renderLive() {
    if (!L.rendered) return;
    const D = liveData(), all = liveAll(), grid = $('#live-grid'), more = $('#live-more');
    $('#live-shuffle').disabled = L.status !== 'ready' || !all.length;
    if (L.status === 'idle' || L.status === 'loading') {
      put($('#live-meta'), 'Cargando…');
      put($('#live-filters'));
      more.hidden = true;
      put(grid);
      return;
    }
    if (L.status === 'error') {
      put($('#live-meta'));
      put($('#live-filters'));
      more.hidden = true;
      put(grid, h('div', { class: 'notice' }, h('h2', null, 'No pude cargar las webs'), h('button', { class: 'btn solid', type: 'button', onclick: () => loadLive(true) }, 'Probar de nuevo')));
      return;
    }

    const q = $('#dq').value.trim();
    const list = liveList();
    put($('#live-meta'), q
      ? [h('b', null, fmtN(list.length)), ` con “${q}”`]
      : [h('b', null, fmtN(all.length)), ' webs', D && D.updated ? ' · ' + ago(D.updated) : '']);
    renderLiveFilters(all);

    const bar = $('#saved-bar');
    bar.hidden = !L.saved.length || L.filter !== 'saved';
    if (!bar.hidden) {
      // The buttons go in their own group: put() replaces the bar's children, tooltip layer included
      put(bar, h('div', { class: 'head-actions', 'data-pour': '' },
        h('button', { class: 'btn sm solid', type: 'button', 'data-tip': 'Tus ★ en un prompt', onclick: copySaved }, 'Copiar para Claude'),
        h('button', { class: 'btn sm ' + (L.clearConfirm ? 'danger' : 'ghost'), type: 'button', 'data-key': 'saved:clear', 'data-tip': L.clearConfirm ? 'Otra vez para borrar' : 'Borra todas las ★', onclick: clearSaved }, L.clearConfirm ? '¿Vaciar?' : 'Vaciar')));
    }

    if (!list.length) {
      more.hidden = true;
      put(grid, notice(L.filter === 'saved' && !q ? 'Todavía no guardaste nada' : q ? `Nada con “${q}”` : 'Nada con esos filtros', q ? 'Probá en las galerías de arriba.' : null));
      return;
    }
    if (grid.querySelector('.notice')) put(grid);
    L.visible = list.slice(0, L.shown);
    reconcile(grid, L.visible.map(getLiveCard));
    more.hidden = list.length <= L.shown;
    more.textContent = `Ver más (${fmtN(list.length - Math.min(list.length, L.shown))})`;
    setTimeout(autoMore, 60);
  }

  // Infinite scroll: when "Ver más" gets near the bottom of the screen, load the next batch.
  // Each batch pushes the button further down, so this stops by itself.
  let autoPending = false;
  function autoMore() {
    const more = $('#live-more');
    if (autoPending || S.tab !== 'discover' || L.status !== 'ready' || more.hidden || !more.offsetParent) return;
    if (more.getBoundingClientRect().top > window.innerHeight + 900) return;
    autoPending = true;
    setTimeout(() => { autoPending = false; L.shown += PAGE; renderLive(); }, 60);
  }

  function nextBatch() {
    const q = $('#dq').value.trim();
    if (L.filter === 'saved') L.filter = 'all';
    const list = liveList();
    // A search with few results: they're all on screen already
    if (q && list.length <= L.visible.length) { toast(`Son todas las que hay con “${q}” (${fmtN(list.length)}). Buscá más en las galerías de arriba.`); return; }
    // Everything on screen counts as seen; unseen sites come first in the next batch.
    // A search keeps its words: the next batch is more of what you searched.
    for (const i of L.visible) L.seen.add(i.link);
    if (list.length && list.every(i => L.seen.has(i.link))) {
      for (const i of list) L.seen.delete(i.link);
      if (q) toast(`Ya viste todas con “${q}”: vuelven a empezar`);
    }
    if (L.seen.size >= liveAll().length) L.seen.clear();
    store.set('seen', [...L.seen].slice(-6000));
    if (!q) {
      L.mode = 'random';
      store.set('liveMode', 'random');
      newRank();
    }
    L.shown = PAGE;
    renderLive();
    $('#live-head').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  // Starred sites become references (see favRefs), so Referencias and Mezclar refresh too
  // ★: saving asks for a folder first (when there are folders); taking it out of a site the robot
  // already uploaded goes through "Sacar", the same as in Referencias
  function toggleSave(it) {
    const uploaded = REFS.find(r => r.url === it.link);
    if (uploaded && !L.saved.some(s => s.link === it.link)) { removeRef(uploaded); return; }
    if (L.saved.some(s => s.link === it.link)) { saveSite(it, null); return; }
    if (!folderList().length) { saveSite(it, []); return; }
    openPick(it);
  }
  function saveSite(it, folders) {
    const key = 'save:' + it.link;
    const wasSaved = folders === null;
    if (wasSaved) {
      L.saved = L.saved.filter(s => s.link !== it.link);
      S.mix.delete('fav:' + it.link);
      store.set('mix', [...S.mix]);
    } else {
      L.saved = [{ link: it.link, title: it.title, name: it.name || '', source: it.source, image: it.image || '', date: it.date || '',
        cats: arr(it.cats).slice(0, 5), desc: it.desc || '', tagline: it.tagline || '', folders }, ...L.saved];
    }
    store.set('saved', L.saved);
    L.clearConfirm = false;
    render();
    renderLive();
    restoreFocus(key);
    toast(wasSaved ? 'Sacada de guardadas' : folders.length ? `★ Guardada en ${folders.map(folderName).join(', ')}` : '★ Guardada en Referencias');
  }
  // "Guardar en": one tap on a folder saves there; "+ Nueva" makes one and saves there
  let pickFor = null;
  function openPick(it) {
    pickFor = it;
    put($('#pick-folders'),
      folderList().map(f => h('button', { class: 'chip', type: 'button', onclick: () => pickDone([f.id]) }, f.name)),
      h('button', { class: 'chip', type: 'button', onclick: () => { $('#pick-new-form').hidden = false; $('#pick-new').focus(); } }, '+ Nueva'));
    $('#pick-new-form').hidden = true;
    $('#pick-new').value = '';
    $('#pick').showModal();
  }
  function pickDone(folders) {
    $('#pick').close();
    if (pickFor) saveSite(pickFor, folders);
    pickFor = null;
  }
  function copySaved() {
    const lines = L.saved.map(s => `- ${s.name || s.title} (${s.source}): ${s.link}`);
    copy(['Agregá estas webs a mi Inspiración Atus. Abrí cada una, sacá captura y armá el ADN y el prompt como las demás:', ...lines].join('\n'), 'Copiado: pegáselo a Claude');
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
    for (const s of L.saved) S.mix.delete('fav:' + s.link);
    store.set('mix', [...S.mix]);
    L.saved = [];
    store.set('saved', L.saved);
    L.filter = 'all';
    S.favOnly = false;
    render();
    renderLive();
  }

  /* ---------- boot ---------- */
  function applyHash() {
    const hash = location.hash;
    const m = hash.match(/^#ref-(.+)$/);
    if (m) {
      const id = decodeURIComponent(m[1]);
      if (findRef(id)) {
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

    let qT = 0;
    $('#q').addEventListener('input', e => {
      S.q = e.target.value;
      clearTimeout(qT);
      qT = setTimeout(renderGrid, 120);
    });

    $('#mix-what').value = store.get('mixWhat', '');
    $('#mix-taste').checked = store.get('mixTaste', true);
    $('#mix-what').addEventListener('input', e => { store.set('mixWhat', e.target.value); renderMixOut(); });
    $('#mix-taste').addEventListener('change', e => { store.set('mixTaste', e.target.checked); renderMixOut(); });
    // Clicking the dark backdrop around the confirm dialog cancels it
    $('#confirm').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
    $('#add-open').addEventListener('click', () => openAdd());
    $('#add-no').addEventListener('click', () => $('#add').close());
    $('#add-url').addEventListener('input', () => { $('#add-err').hidden = true; });
    $('#add-form').addEventListener('submit', e => {
      e.preventDefault();
      if (!addPage($('#add-url').value)) { $('#add-err').hidden = false; $('#add-url').focus(); }
    });
    // A click outside a box (on the dark backdrop) closes it; the padding inside doesn't
    for (const d of $$('#add, #pick, #folder-dlg')) d.addEventListener('click', e => {
      const b = e.currentTarget.getBoundingClientRect();
      if (e.target === e.currentTarget && (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom)) e.currentTarget.close();
    });
    $('#pick-none').addEventListener('click', () => pickDone([]));
    $('#pick-new-form').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#pick-new').value.trim().slice(0, 40);
      if (!name) { $('#pick-new').focus(); return; }
      pickDone([findFolderByName(name) || createFolder(name)]);
    });
    $('#folder-form').addEventListener('submit', e => { e.preventDefault(); saveFolderDlg(); });
    $('#folder-no').addEventListener('click', () => $('#folder-dlg').close());
    $('#folder-del').addEventListener('click', deleteFolder);
    $('#sync-go').addEventListener('click', upload);
    // Pasting a link anywhere in Referencias (outside a field) opens the box with it
    document.addEventListener('paste', e => {
      if (S.tab !== 'refs' || S.sheet || isTyping(e.target) || $$('dialog[open]').length) return;
      const url = cleanUrl(e.clipboardData && e.clipboardData.getData('text'));
      if (!url) return;
      e.preventDefault();
      openAdd(url);
    });
    $('#mix-copy').addEventListener('click', () => copy(mixPrompt(), 'Prompt copiado'));
    $('#mix-reset').addEventListener('click', resetMix);

    $('#dq').value = store.get('dq', '');
    let dqT = 0;
    $('#dq').addEventListener('input', e => {
      store.set('dq', e.target.value);
      L.shown = PAGE;
      renderGalleries();
      clearTimeout(dqT);
      dqT = setTimeout(renderLive, 150);
    });
    $('#live-shuffle').addEventListener('click', nextBatch);
    $('#live-more').addEventListener('click', () => { L.shown += PAGE; renderLive(); });
    window.addEventListener('scroll', autoMore, { passive: true });

    $('#sheet-close').addEventListener('click', requestClose);
    $('#sheet-scrim').addEventListener('click', requestClose);
    $('#sheet-prev').addEventListener('click', () => stepDetail(-1));
    $('#sheet-next').addEventListener('click', () => stepDetail(1));
    window.addEventListener('popstate', applyHash);

    document.addEventListener('keydown', e => {
      if (!S.sheet) {
        if (e.key === '/' && !isTyping(e.target) && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          (S.tab === 'discover' ? $('#dq') : (S.tab !== 'refs' && setTab('refs', { scroll: false }), $('#q'))).focus();
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
        const f = $$('#sheet-panel button, #sheet-panel a[href], #sheet-panel summary, #sheet-panel textarea:not(.vh)').filter(x => !x.disabled && x.getClientRects().length);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // Drop mix picks whose reference no longer exists (e.g. a favorite removed on another visit)
    for (const id of [...S.mix]) if (!findRef(id)) S.mix.delete(id);
    store.set('mix', [...S.mix]);

    const initial = tabFromHash(location.hash) || (/^#ref-/.test(location.hash) ? 'refs' : store.get('tab', 'refs'));
    setTab(TABS.includes(initial) ? initial : 'refs', { scroll: false, keepHash: /^#ref-/.test(location.hash) });
    renderTaste();
    render();
    applyHash();
  }

  boot();
})();
