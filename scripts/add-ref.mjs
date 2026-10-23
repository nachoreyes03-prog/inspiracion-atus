// Adds a site to data.js from its link: opens it in headless Chrome, takes two screenshots,
// reads the fonts and colors the page really uses and writes a reference at the top of the list.
// Run by .github/workflows/agregar.yml when the "+ Agregar" button opens an issue.
//
// Env: ISSUE_BODY / ISSUE_TITLE (or URL) with the link · DRY_RUN=1 writes nothing in the repo
// and leaves the screenshots and the entry in out/ · CHROME to point at a browser by hand.
// Results go to $GITHUB_OUTPUT: status (added | exists | error), name, id, error.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.env.DRY_RUN === '1';
const PORT = 9333;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function output(values) {
  const lines = Object.entries(values).map(([k, v]) => `${k}=${String(v ?? '').replace(/\r?\n/g, ' ')}`).join('\n') + '\n';
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, lines);
  process.stdout.write(lines);
}

// Same rule as the site (app.js siteKey): shared hosts are told apart by path, the rest by host
const SHARED_HOSTS = /(^|\.)(behance\.net|dribbble\.com|instagram\.com|pinterest\.[a-z.]+|x\.com|twitter\.com|youtube\.com|vimeo\.com|medium\.com|github\.com|notion\.so|awwwards\.com|framer\.com|linkedin\.com)$/;
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const siteKey = u => {
  const h = hostOf(u);
  if (!SHARED_HOSTS.test(h)) return h;
  try { return h + new URL(u).pathname.replace(/\/+$/, '').toLowerCase(); } catch { return h; }
};

function findUrl() {
  const body = process.env.URL || process.env.ISSUE_BODY || '';
  let u = (body.match(/https?:\/\/[^\s<>"'`]+/i) || [])[0];
  // The issue title is "Agregar: site.com" when the body was edited away
  if (!u) {
    const t = (process.env.ISSUE_TITLE || '').replace(/^agregar:?\s*/i, '').trim();
    if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t)) u = 'https://' + t;
  }
  if (!u) return null;
  u = u.replace(/[.,;:!?)\]]+$/, '');
  try { const x = new URL(u); x.hash = ''; return x.href; } catch { return null; }
}

const parseData = src => JSON.parse(src.slice(src.indexOf('{', src.indexOf('window.ATUS_DATA')), src.lastIndexOf('}') + 1));

/* ---------- Chrome over the DevTools protocol (Node 22 has WebSocket built in) ---------- */
function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  return ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser', '/usr/bin/chromium',
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']
    .find(p => existsSync(p));
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const waiting = new Map(), listeners = new Set();
    let n = 0;
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.id && waiting.has(m.id)) {
        const { res, rej } = waiting.get(m.id);
        waiting.delete(m.id);
        if (m.error) rej(new Error(m.error.message)); else res(m.result);
      } else if (m.method) for (const l of listeners) l(m);
    };
    ws.onerror = () => reject(new Error('no pude conectarme con Chrome'));
    ws.onopen = () => resolve({
      send: (method, params = {}) => new Promise((res, rej) => {
        const id = ++n;
        waiting.set(id, { res, rej });
        ws.send(JSON.stringify({ id, method, params }));
      }),
      wait: (method, ms) => new Promise(res => {
        const l = m => { if (m.method === method) { clearTimeout(t); listeners.delete(l); res(m); } };
        const t = setTimeout(() => { listeners.delete(l); res(null); }, ms);
        listeners.add(l);
      }),
      close: () => ws.close(),
    });
  });
}

// Cookie banners would cover the screenshot. They're hidden, never accepted.
const HIDE_BANNERS = '#onetrust-consent-sdk,#onetrust-banner-sdk,#CybotCookiebotDialog,#cookie-law-info-bar,#usercentrics-root,#didomi-host,.fc-consent-root,.osano-cm-window,#hs-eu-cookie-confirmation,.cc-window,.cookie-banner,.cookies-banner,#cookie-banner,#cookieConsent,[id*="cookie-consent" i],[class*="cookie-consent" i],[id*="cookiebanner" i],[class*="cookiebanner" i]{display:none!important}';

// Runs inside the page: which fonts and colors carry the first two screens, and what it's built with
function analyze() {
  const meta = n => (document.querySelector(`meta[property="${n}"], meta[name="${n}"]`) || {}).content || '';
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  // Any CSS color (rgb, oklch, color()) → #RRGGBB through a 1px canvas; see-through colors don't count
  const hex = c => {
    if (!c || c === 'transparent') return null;
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = '#000';
    cx.fillStyle = c;
    cx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data;
    if (a < 230) return null;
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  };
  const W = innerWidth, H = Math.max(innerHeight * 2, 1800);
  const bgs = new Map(), texts = new Map(), fonts = new Map();
  const add = (m, k, v) => m.set(k, (m.get(k) || 0) + v);
  const base = hex(getComputedStyle(document.body).backgroundColor) || hex(getComputedStyle(document.documentElement).backgroundColor) || '#FFFFFF';
  add(bgs, base, W * H * 0.5);
  const els = document.body.querySelectorAll('*');
  for (let i = 0; i < els.length && i < 6000; i++) {
    const el = els[i];
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.1) continue;
    const area = (Math.min(r.right, W) - Math.max(r.left, 0)) * (Math.min(r.bottom, H) - Math.max(r.top, 0));
    const bg = hex(cs.backgroundColor);
    if (bg && area > 0) add(bgs, bg, area);
    let text = '';
    for (const nd of el.childNodes) if (nd.nodeType === 3) text += nd.textContent;
    text = text.replace(/\s+/g, ' ').trim();
    if (!text || r.top > H) continue;
    const chars = Math.min(text.length, 400);
    const col = hex(cs.color);
    if (col) add(texts, col, chars);
    const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    if (!fam) continue;
    const size = parseFloat(cs.fontSize) || 0;
    const f = fonts.get(fam) || { chars: 0, maxSize: 0, weights: {}, upper: 0, sample: '' };
    f.chars += chars;
    if (size > f.maxSize) { f.maxSize = size; f.sample = text.slice(0, 40); }
    f.weights[cs.fontWeight] = (f.weights[cs.fontWeight] || 0) + chars;
    if (cs.textTransform === 'uppercase' || (text === text.toUpperCase() && /[A-Z]/.test(text))) f.upper += chars;
    fonts.set(fam, f);
  }
  const scripts = [...document.scripts].map(s => s.src).join(' ') + ' ' + [...document.querySelectorAll('link[href]')].map(l => l.href).join(' ');
  const has = re => re.test(scripts);
  const gen = meta('generator');
  const stack = [];
  if (/webflow/i.test(gen) || document.documentElement.hasAttribute('data-wf-page')) stack.push('Webflow');
  else if (/framer/i.test(gen) || document.querySelector('[data-framer-name],[data-framer-component-type]')) stack.push('Framer');
  else if (/wordpress/i.test(gen) || has(/wp-content|wp-includes/)) stack.push('WordPress');
  else if (/wix/i.test(gen) || has(/wixstatic|parastorage/)) stack.push('Wix');
  else if (/squarespace/i.test(gen) || has(/squarespace/)) stack.push('Squarespace');
  else if (/cargo/i.test(gen) || has(/cargo\.site|cargocollective/)) stack.push('Cargo');
  else if (window.Shopify) stack.push('Shopify');
  else if (window.__NEXT_DATA__ || document.getElementById('__next') || has(/\/_next\//)) stack.push('Next.js');
  else if (window.__NUXT__ || has(/\/_nuxt\//)) stack.push('Nuxt');
  else if (document.getElementById('root') && has(/static\/js\/main/)) stack.push('React');
  if (window.gsap || has(/gsap/i)) stack.push('GSAP');
  if (window.Lenis || window.lenis || document.documentElement.classList.contains('lenis') || has(/lenis/i)) stack.push('Lenis');
  if (window.THREE || has(/three(\.module)?(\.min)?\.js/i)) stack.push('three.js');
  if (window.barba || has(/barba/i)) stack.push('Barba');
  return {
    title: document.title || '',
    site: meta('og:site_name'),
    description: meta('og:description') || meta('description'),
    loaded: [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/["']/g, '')))],
    bgs: [...bgs].sort((a, b) => b[1] - a[1]).slice(0, 12),
    texts: [...texts].sort((a, b) => b[1] - a[1]).slice(0, 12),
    fonts: [...fonts].sort((a, b) => b[1].chars - a[1].chars).slice(0, 12),
    total: W * H,
    stack,
  };
}

// Runs inside the page with the screenshot: its most common color. Catches backgrounds painted by
// a canvas or an image, which the DOM doesn't show. Resolves null if the page's CSP blocks it.
function dominantColor(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const w = 144, h = 90, cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      cx.drawImage(img, 0, 0, w, h);
      const d = cx.getImageData(0, 0, w, h).data, buckets = new Map();
      for (let i = 0; i < d.length; i += 4) {
        const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
        const b = buckets.get(k) || [0, 0, 0, 0];
        b[0] += d[i]; b[1] += d[i + 1]; b[2] += d[i + 2]; b[3]++;
        buckets.set(k, b);
      }
      const top = [...buckets.values()].sort((x, y) => y[3] - x[3])[0];
      resolve({ hex: '#' + top.slice(0, 3).map(v => Math.round(v / top[3]).toString(16).padStart(2, '0')).join('').toUpperCase(), share: top[3] / (w * h) });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/* ---------- turning the analysis into a reference ---------- */
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const dist = (a, b) => { const x = rgb(a), y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
const lum = h => { const [r, g, b] = rgb(h); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
const GENERIC_FONTS = /^(-apple-system|blinkmacsystemfont|system-ui|segoe ui|roboto|helvetica|helvetica neue|arial|sans-serif|serif|monospace|times|times new roman|ui-sans-serif|ui-serif|ui-monospace|inherit)$/i;

function pickName(a, url) {
  const label = hostOf(url).split('.')[0];
  const squash = s => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
  if (a.site && a.site.length <= 40) return a.site.trim();
  const parts = a.title.split(/\s+[|–—·:•-]\s+/).map(s => s.trim()).filter(Boolean);
  const own = parts.find(p => squash(p) && (squash(label).includes(squash(p)) || squash(p).includes(squash(label))));
  const notGeneric = parts.find(p => !/^(home|inicio|index|welcome|bienvenid[oa]s?|portfolio)$/i.test(p));
  const name = own || notGeneric || parts[0] || '';
  return name && name.length <= 40 ? name : label.charAt(0).toUpperCase() + label.slice(1);
}

function pickFonts(a) {
  const list = a.fonts.filter(([fam]) => !GENERIC_FONTS.test(fam));
  const use = list.length ? list : a.fonts;
  if (!use.length) return [];
  const total = use.reduce((s, [, f]) => s + f.chars, 0) || 1;
  const biggest = [...use].sort((x, y) => y[1].maxSize - x[1].maxSize)[0];
  const most = use[0];
  const weightsOf = f => Object.entries(f.weights).sort((x, y) => y[1] - x[1]).slice(0, 2).map(([w]) => w).join(' y ');
  const out = [];
  const describe = ([fam, f], role) => {
    const caps = f.upper > f.chars * 0.6 ? ', en mayúscula' : '';
    return `${fam} — ${role} (${Math.round(f.maxSize)}px, peso ${weightsOf(f)}${caps})`;
  };
  out.push(describe(biggest, biggest === most ? 'titulares y textos' : 'titulares'));
  if (most !== biggest) out.push(describe(most, 'textos'));
  for (const fx of use) {
    if (out.length >= 3) break;
    if (fx !== biggest && fx !== most && fx[1].chars / total > 0.08) out.push(describe(fx, 'detalles'));
  }
  return out;
}

// The background: the screenshot's main color when it covers a quarter of it, else the DOM's
const fondoOf = (a, shotBg) => (shotBg && shotBg.share >= 0.25 ? shotBg.hex : a.bgs[0] && a.bgs[0][0]);

function pickPalette(a, shotBg) {
  const out = [];
  const push = (h, label) => { if (h && !out.some(o => dist(o.h, h) < 40)) out.push({ h, label }); };
  const fondo = fondoOf(a, shotBg);
  push(fondo, 'fondo');
  const texto = (a.texts.find(([h]) => !fondo || dist(h, fondo) > 60) || [])[0];
  push(texto, 'texto');
  for (const [h, area] of a.bgs.slice(1)) if (area / a.total > 0.02) push(h, '');
  const chars = a.texts.reduce((s, [, c]) => s + c, 0) || 1;
  for (const [h, c] of a.texts) if (c / chars > 0.04) push(h, '');
  return out.slice(0, 6).map(o => o.label ? `${o.h} ${o.label}` : o.h);
}

function formatEntry(e) {
  return '    {\n' + Object.entries(e).map(([k, v]) => `      ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n') + '\n    }';
}

/* ---------- main ---------- */
async function main() {
  const url = findUrl();
  if (!url) { await output({ status: 'error', error: 'no encontré un link en el issue' }); return; }

  const dataFile = path.join(ROOT, 'data.js');
  let src = await readFile(dataFile, 'utf8');
  const data = parseData(src);
  const key = siteKey(url);
  const same = data.refs.find(r => r.url && siteKey(r.url) === key);
  if (same) { await output({ status: 'exists', name: same.name, id: same.id }); return; }

  const chromePath = findChrome();
  if (!chromePath) throw new Error('no encontré Chrome');
  const profile = await mkdtemp(path.join(tmpdir(), 'atus-'));
  const chrome = spawn(chromePath, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run',
    '--no-default-browser-check', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
  let c = null;
  try {
    let target = null;
    for (let i = 0; i < 40 && !target; i++) {
      await sleep(500);
      try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(t => t.type === 'page'); } catch { /* not up yet */ }
    }
    if (!target) throw new Error('Chrome no arrancó');
    c = await connect(target.webSocketDebuggerUrl);
    await c.send('Page.enable');
    await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    const loaded = c.wait('Page.loadEventFired', 30000);
    const nav = await c.send('Page.navigate', { url });
    if (nav.errorText) throw new Error(`no pude abrir la página (${nav.errorText})`);
    await loaded;
    await sleep(4000);
    await c.send('Runtime.evaluate', { expression: `document.documentElement.appendChild(Object.assign(document.createElement('style'), { textContent: ${JSON.stringify(HIDE_BANNERS)} }))` });
    // Intros and loaders run in real time and slower here, without a GPU (Lusion's took ~9 s):
    // give them 10 s, then wait until two screenshots in a row weigh about the same
    await sleep(6000);
    const snap = async () => Buffer.from((await c.send('Page.captureScreenshot', { format: 'jpeg', quality: 60 })).data, 'base64').length;
    let prev = await snap();
    for (let i = 0; i < 8; i++) {
      await sleep(2500);
      const cur = await snap();
      const ratio = cur / prev;
      prev = cur;
      if (ratio > 0.85 && ratio < 1.15) break;
    }

    const res = await c.send('Runtime.evaluate', { expression: `(${analyze})()`, returnByValue: true });
    if (res.exceptionDetails) throw new Error('no pude leer la página');
    const a = res.result.value;

    const shot1 = Buffer.from((await c.send('Page.captureScreenshot', { format: 'jpeg', quality: 80 })).data, 'base64');
    // The wheel scrolls pages with their own scroller (Lenis, a scrolling div) too
    await c.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 720, y: 450, deltaX: 0, deltaY: 900 });
    await sleep(2500);
    const shot2 = Buffer.from((await c.send('Page.captureScreenshot', { format: 'jpeg', quality: 80 })).data, 'base64');

    const name = pickName(a, url);
    let id = hostOf(url).split('.').filter(p => p !== 'www')[0].replace(/[^a-z0-9-]/g, '') || 'web';
    if (SHARED_HOSTS.test(hostOf(url))) id += '-' + (new URL(url).pathname.split('/').filter(Boolean).pop() || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24);
    id = id.replace(/-+$/, '');
    const ids = new Set(data.refs.map(r => r.id));
    for (let i = 2; ids.has(id); i++) id = id.replace(/-\d+$/, '') + '-' + i;

    const bgRes = await c.send('Runtime.evaluate', { expression: `(${dominantColor})(${JSON.stringify('data:image/jpeg;base64,' + shot1.toString('base64'))})`, awaitPromise: true, returnByValue: true }).catch(() => null);
    const shotBg = bgRes && bgRes.result && bgRes.result.value;
    a.shotBg = shotBg;

    const fonts = pickFonts(a);
    const palette = pickPalette(a, shotBg);
    const fondo = fondoOf(a, shotBg);
    const tags = fondo ? [lum(fondo) < 0.35 ? 'oscuro' : 'claro'] : [];
    const stack = a.stack.join(' · ');
    const shots = [`img/${id}.jpg`];
    const twoShots = !shot1.equals(shot2);
    if (twoShots) shots.push(`img/${id}-2.jpg`);

    const prompt = [
      `Diseñá una web con la dirección visual de ${name} (${url}).`,
      fonts.length ? `Tipografía: ${fonts.join('; ')}.` : '',
      palette.length ? `Paleta: ${palette.join(', ')}.` : '',
      stack ? `Hecha con: ${stack}.` : '',
      'Mirá las capturas y la web: tomá de ahí la grilla, la escala de los titulares, el uso de la imagen y el ritmo entre secciones.',
      'Adaptalo a: [tu proyecto].',
    ].filter(Boolean).join('\n');

    // "auto": filled in by the robot; Claude can complete layout, motion, dna and rubro later
    const entry = { id, name, url, rubro: '', atus: false, tags, likes: '', avoid: '', shots, fonts, palette, layout: '', motion: '', stack, dna: '', prompt, auto: true };

    const outDir = DRY ? path.join(ROOT, 'out') : path.join(ROOT, 'img');
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, `${id}.jpg`), shot1);
    if (twoShots) await writeFile(path.join(outDir, `${id}-2.jpg`), shot2);

    if (DRY) {
      await writeFile(path.join(outDir, 'entry.json'), JSON.stringify({ entry, analysis: a }, null, 2));
      console.log(formatEntry(entry));
    } else {
      const today = new Date().toISOString().slice(0, 10);
      src = src.replace(/("refs":\s*\[[ \t]*\r?\n)/, `$1${formatEntry(entry)},\n`).replace(/"updated":\s*"[^"]*"/, `"updated": "${today}"`);
      parseData(src); // throws before writing if the file would break
      await writeFile(dataFile, src);
      // A new ?v= on data.js so phones don't keep the cached list
      const indexFile = path.join(ROOT, 'index.html');
      const index = await readFile(indexFile, 'utf8');
      await writeFile(indexFile, index.replace(/data\.js\?v=[^"]*/, `data.js?v=${today.replace(/-/g, '')}-a${Date.now() % 100000}`));
    }
    await output({ status: 'added', name, id });
  } finally {
    if (c) c.close();
    chrome.kill('SIGKILL');
    await sleep(300);
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }
}

const guard = setTimeout(() => { console.error('El robot tardó demasiado'); process.exit(1); }, 150000);
main()
  .catch(async e => { console.error(e); await output({ status: 'error', error: e.message }); })
  .finally(() => clearTimeout(guard));
