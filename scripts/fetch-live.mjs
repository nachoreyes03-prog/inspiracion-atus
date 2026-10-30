// Pulls websites from gallery RSS feeds into live.js and keeps a growing archive.
// Runs on GitHub Actions (.github/workflows/live.yml). No dependencies: Node 18+.
// PAGES=n reads n pages of the feeds that paginate (use a big number once to backfill old sites).
// SEARCH="law firm, tattoo" skips the feeds and searches only those words in the galleries (the
// site's "Buscar más" button, through .github/workflows/agregar.yml); the words are kept in
// scripts/rubros-extra.txt so the regular sweep keeps searching them.
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const OUT = new URL('../live.js', import.meta.url);
const MAX_ITEMS = 3000;
const PAGES = Math.max(1, Math.min(300, parseInt(process.env.PAGES || '2', 10) || 2));
// Some galleries answer 403 to bot-looking user agents, so present a regular browser one
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const FEEDS = [
  { name: 'Minimal Gallery', home: 'https://minimal.gallery/', url: p => `https://minimal.gallery/feed/?paged=${p}`, paged: true },
  { name: 'One Page Love', home: 'https://onepagelove.com/', url: p => `https://onepagelove.com/feed?paged=${p}`, paged: true },
  { name: 'SiteInspire', home: 'https://www.siteinspire.com/', url: () => 'https://www.siteinspire.com/websites/feed' },
  { name: 'Lapa Ninja', home: 'https://www.lapa.ninja/', url: () => 'https://www.lapa.ninja/index.xml' },
  { name: 'CSS Winner', home: 'https://www.csswinner.com/', url: () => 'https://www.csswinner.com/feed' },
  { name: 'Behance', home: 'https://www.behance.net/', url: () => 'https://www.behance.net/feeds/projects?field=web%20design' },
  { name: 'The FWA', home: 'https://thefwa.com/', url: () => 'https://www.thefwa.com/rss' },
  { name: 'Typewolf', home: 'https://www.typewolf.com/', url: () => 'https://www.typewolf.com/feed' },
  { name: 'Mindsparkle', home: 'https://mindsparklemag.com/', url: () => 'https://mindsparklemag.com/feed/' },
  { name: 'Land-book', home: 'https://land-book.com/', url: () => 'https://land-book.com/feed' },
];
// Rubros searched on One Page Love so the archive has sites for each kind of business.
// Each run takes a slice (all of them with RUBROS_ALL=1).
const RUBROS = ['dentist', 'dental', 'clinic', 'doctor', 'health', 'hospital', 'pharmacy', 'psychologist', 'therapy', 'wellness',
  'spa', 'beauty', 'salon', 'barber', 'skincare', 'cosmetics', 'fitness', 'gym', 'yoga', 'sport', 'restaurant', 'cafe', 'coffee',
  'bakery', 'bar', 'wine', 'beer', 'food', 'chef', 'hotel', 'travel', 'tourism', 'real estate', 'architecture', 'interior design',
  'construction', 'furniture', 'lawyer', 'law firm', 'finance', 'bank', 'insurance', 'accounting', 'consulting', 'agency', 'startup',
  'saas', 'app', 'ai', 'crypto', 'ecommerce', 'fashion', 'jewelry', 'shoes', 'photography', 'photographer', 'film', 'music', 'band',
  'festival', 'event', 'wedding', 'conference', 'museum', 'art', 'gallery', 'artist', 'school', 'university', 'education', 'kids',
  'nonprofit', 'charity', 'magazine', 'podcast', 'book', 'author', 'car', 'bike', 'pet', 'veterinary', 'farm', 'garden', 'florist',
  'energy', 'solar', 'logistics', 'manufacturing', 'tech', 'game', 'portfolio', 'designer', 'developer', 'studio'];
// Words searched with "Buscar más", one per line
const EXTRA_FILE = new URL('./rubros-extra.txt', import.meta.url);
const EXTRA = (await readFile(EXTRA_FILE, 'utf8').catch(() => '')).split(/\r?\n/).map(s => s.trim().toLowerCase()).filter(Boolean);
const SEARCH = [...new Set(String(process.env.SEARCH || '').split(/[,\n]/).map(s => s.trim().toLowerCase().replace(/\s+/g, ' ')).filter(s => s.length > 1 && s.length < 40))].slice(0, 5);
const RUBRO_SLICE = 16;
const ALL_RUBROS = process.env.RUBROS_ALL === '1';
// One Page Love search results also list templates and articles; keep only websites
const NOT_A_SITE = /^(template review|interview|podcast|resource|news|tutorial|freebie|giveaway|article)\b/i;
// Categories that say nothing about the design
const SKIP_CATS = /^(uncategorized|inspiration|website inspiration|long screenshot|featured|designs?)$/i;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', laquo: '«', raquo: '»' };
const unCdata = s => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
const decode = s => String(s || '')
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
// Some feeds (Lapa Ninja, CSS Winner) entity-escape their HTML, so decode before stripping tags
const html = s => decode(unCdata(s));
const plain = s => decode(html(s).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i')); return m ? m[1] : ''; };
const tags = (xml, name) => [...xml.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'gi'))].map(m => m[1]);
const isHttp = u => /^https?:\/\//i.test(u || '');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function imageOf(item) {
  const media = item.match(/<media:content[^>]*\surl="([^"]+)"/i)
    || item.match(/<media:thumbnail[^>]*\surl="([^"]+)"/i)
    || item.match(/<enclosure[^>]*\surl="([^"]+)"[^>]*type="image/i);
  if (media) {
    // SiteInspire serves 1600px crops; ask its image CDN for a card-sized one
    return decode(media[1]).replace('width=1600,height=1000', 'width=960,height=600');
  }
  const body = html(tag(item, 'content:encoded') + ' ' + tag(item, 'description'));
  const srcset = body.match(/srcset=["']([^"']+)["']/i);
  if (srcset) {
    const pick = srcset[1].split(',')
      .map(part => part.trim().split(/\s+/))
      .map(([u, w]) => ({ u, w: parseInt(w, 10) || 0 }))
      .filter(c => isHttp(c.u) && c.w >= 700)
      .sort((a, b) => a.w - b.w)[0];
    if (pick) return pick.u;
  }
  const img = body.match(/<img[^>]*\ssrc=["']([^"']+)["']/i);
  return img ? img[1] : '';
}

function dateOf(raw, image) {
  const d = new Date(plain(tag(raw, 'pubDate')) || plain(tag(raw, 'dc:date')));
  if (!isNaN(d)) return d.toISOString();
  // Typewolf has no dates but names its screenshots by day (…/sotd/2025-12-14.png)
  const m = String(image).match(/(20\d\d-\d\d-\d\d)/);
  return m ? new Date(m[1] + 'T12:00:00Z').toISOString() : '';
}

function parseItem(raw, feed) {
  const link = plain(tag(raw, 'link')) || plain(tag(raw, 'guid'));
  const rawTitle = plain(tag(raw, 'title'));
  if (NOT_A_SITE.test(rawTitle)) return null;
  const title = rawTitle.replace(/^website inspiration:\s*/i, '');
  if (!isHttp(link) || !title) return null;
  const [name, ...rest] = title.split(/\s+[|–—]\s+/);
  let desc = plain(tag(raw, 'description'))
    .replace(/\s*Full Review\s*$/i, '')
    .replace(/The post .* appeared first on .*$/i, '')
    .replace(/^FWA of the day [^:]*:\s*/i, '')
    .replace(/\s*Project Link\s*/i, ' ')
    .replace(/#\w+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (desc.startsWith(title)) desc = desc.slice(title.length).trim();
  const image = imageOf(raw);
  return {
    title,
    name: name.trim(),
    tagline: rest.join(' – ').trim(),
    desc: desc.length > 180 ? desc.slice(0, 177).replace(/\s+\S*$/, '') + '…' : desc,
    link,
    image: isHttp(image) ? image : '',
    cats: [...new Set(tags(raw, 'category').map(plain).filter(c => c && c.length < 40 && !SKIP_CATS.test(c)))].slice(0, 5),
    source: feed.name,
    date: dateOf(raw, image),
  };
}

async function readPage(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/rss+xml, application/xml, text/xml, */*' }, signal: AbortSignal.timeout(25000) });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  return xml.split(/<item[\s>]/i).slice(1).map(chunk => chunk.split(/<\/item>/i)[0]);
}

async function readFeed(feed) {
  const items = [];
  const pages = feed.paged ? PAGES : 1;
  for (let p = 1; p <= pages; p++) {
    let raws;
    try {
      raws = await readPage(feed.url(p));
    } catch (err) {
      if (p === 1) throw err;
      console.warn(`${feed.name}: stopped at page ${p} (${err.message})`);
      break;
    }
    if (!raws.length) break;
    items.push(...raws.map(raw => parseItem(raw, feed)).filter(Boolean));
    if (pages > 1) await sleep(300);
  }
  return items;
}

async function readPrevious() {
  try {
    const js = await readFile(OUT, 'utf8');
    const data = JSON.parse(js.slice(js.indexOf('{'), js.lastIndexOf('}') + 1));
    return Array.isArray(data.items) ? data : { items: [] };
  } catch {
    return { items: [] };
  }
}

const previous = await readPrevious();
const byLink = new Map(previous.items.filter(i => i && i.link).map(i => [i.link, i]));
const now = new Date().toISOString();
// A search run reads no feeds, so it keeps what the last full run said about them
const sources = SEARCH.length && Array.isArray(previous.sources) ? previous.sources : [];
let okCount = 0;

function store(it, term) {
  const old = byLink.get(it.link);
  // Keep the first date we saw for feeds that don't publish one, and every rubro a site was found under
  it.date = it.date || (old && old.date) || now;
  const q = new Set([...((old && old.q) || []), ...(term ? [term] : [])]);
  if (q.size) it.q = [...q];
  byLink.set(it.link, it);
}

for (const feed of SEARCH.length ? [] : FEEDS) {
  try {
    const items = await readFeed(feed);
    for (const it of items) store(it);
    sources.push({ name: feed.name, home: feed.home, count: items.length, ok: true });
    okCount++;
    console.log(`${feed.name}: ${items.length} items`);
  } catch (err) {
    sources.push({ name: feed.name, home: feed.home, count: 0, ok: false });
    console.warn(`${feed.name}: failed (${err.message})`);
  }
}

if (!okCount && !SEARCH.length) {
  console.error('Every feed failed; keeping the previous live.js.');
  process.exit(1);
}

// Awwwards has no feed, but its search page carries each site as a JSON attribute
// (title, slug, picture, date, tags): about 30 per page.
const AW_PAGES = 3;
const AW_TECH = /^(gsap|javascript|wordpress|webflow|react|vue(\.?js)?|nuxt(\.?js)?|next\.?js|three\.?js|webgl|html5?|css3?|php|shopify|framer|figma|svelte|typescript|tailwind|laravel|python|lottie|swiper|barba(\.?js)?|locomotive|lenis|ui design|ux design|navigation menu|animation|transitions?|scrolling|parallax|responsive design|microinteractions|interaction design|header|footer|hamburger menu)$/i;
const unescapeHtml = s => s.replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
async function awwwardsSearch(term, page) {
  const res = await fetch(`https://www.awwwards.com/websites/?text=${encodeURIComponent(term)}&page=${page}`, { headers: { 'user-agent': UA, accept: 'text/html' }, signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const seen = new Set(), out = [];
  for (const m of html.matchAll(/data-collectable-model-value="([^"]+)"/g)) {
    let d;
    try { d = JSON.parse(unescapeHtml(m[1])); } catch { continue; }
    if (!d || d.type !== 'submission' || !d.slug || !d.title || seen.has(d.slug)) continue;
    seen.add(d.slug);
    const thumb = (d.images && d.images.thumbnail) || d.collectableImage || '';
    out.push({
      title: unescapeHtml(String(d.title)),
      name: unescapeHtml(String(d.title)),
      tagline: '',
      desc: '',
      link: `https://www.awwwards.com/sites/${d.slug}`,
      image: thumb ? `https://assets.awwwards.com/awards/media/cache/thumb_880_660/${thumb}` : '',
      cats: (Array.isArray(d.tags) ? d.tags : []).map(t => unescapeHtml(String(t))).filter(t => t.length < 40 && !AW_TECH.test(t)).slice(0, 5),
      source: 'Awwwards',
      date: d.createdAt ? new Date(d.createdAt * 1000).toISOString() : '',
    });
  }
  return out;
}

// Rubro sweep: One Page Love's search and tag pages and Minimal Gallery's search (both WordPress,
// 10 sites per page), plus Awwwards' search. Reads up to RUBRO_PAGES pages of each, until one
// comes back short.
const RUBRO_PAGES = 5;
const opl = FEEDS.find(f => f.name === 'One Page Love');
const mg = FEEDS.find(f => f.name === 'Minimal Gallery');
const ALL_TERMS = [...new Set([...RUBROS, ...EXTRA])];
const slots = Math.ceil(ALL_TERMS.length / RUBRO_SLICE);
const slot = Math.floor(Date.now() / (6 * 3600e3)) % slots;
const terms = SEARCH.length ? SEARCH : ALL_RUBROS ? ALL_TERMS : ALL_TERMS.slice(slot * RUBRO_SLICE, (slot + 1) * RUBRO_SLICE);
const before = new Set(byLink.keys());
let rubroHits = 0;
for (const term of terms) {
  const q = encodeURIComponent(term);
  const sources = [
    [opl, p => `https://onepagelove.com/?s=${q}&feed=rss2&paged=${p}`],
    [opl, p => `https://onepagelove.com/tag/${term.replace(/\s+/g, '-')}/feed?paged=${p}`],
    [mg, p => `https://minimal.gallery/?s=${q}&feed=rss2&paged=${p}`],
  ];
  for (const [feed, url] of sources) {
    for (let p = 1; p <= RUBRO_PAGES; p++) {
      let items = [];
      try { items = await readPage(url(p)); } catch { items = []; } // a rubro without results is fine
      for (const raw of items) {
        const it = parseItem(raw, feed);
        if (it) { store(it, term); rubroHits++; }
      }
      await sleep(400);
      if (items.length < 10) break;
    }
  }
  for (let p = 1; p <= AW_PAGES; p++) {
    let items = [];
    try { items = await awwwardsSearch(term, p); } catch { items = []; }
    for (const it of items) { store(it, term); rubroHits++; }
    await sleep(800);
    if (items.length < 20) break;
  }
}
console.log(`Rubros (${terms.length}): ${rubroHits} hits`);

// "Buscar más": remember the words for the regular sweep and answer the issue with what came in
if (SEARCH.length) {
  const fresh = SEARCH.filter(t => !RUBROS.includes(t) && !EXTRA.includes(t));
  if (fresh.length) await writeFile(EXTRA_FILE, [...EXTRA, ...fresh].join('\n') + '\n');
  const lines = SEARCH.map(t => {
    const all = [...byLink.values()].filter(i => (i.q || []).includes(t));
    const added = all.filter(i => !before.has(i.link)).length;
    return `- **${t}**: ${added ? `${added} webs nuevas` : 'ninguna nueva'} (${all.length} en total en el archivo)`;
  });
  const site = process.env.SITE || '';
  await mkdir(new URL('../out/', import.meta.url), { recursive: true });
  await writeFile(new URL('../out/reply.md', import.meta.url), `Busqué en One Page Love, Minimal Gallery y Awwwards:\n${lines.join('\n')}\n\nDesde ahora el robot las sigue buscando cada tantas horas.${site ? `\n\nEn uno o dos minutos están en Descubrir: ${site}#descubrir` : ''}`);
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `summary=más webs de ${SEARCH.join(', ')}\n`);
}

// Sites found under a rubro always stay; the rest keeps the newest MAX_ITEMS
const byDate = (a, b) => Date.parse(b.date) - Date.parse(a.date);
const everything = [...byLink.values()].sort(byDate);
const tagged = everything.filter(i => i.q && i.q.length);
const rest = everything.filter(i => !(i.q && i.q.length)).slice(0, MAX_ITEMS);
const items = [...tagged, ...rest].sort(byDate);

if (JSON.stringify(items) === JSON.stringify(previous.items)) {
  console.log('No new websites; live.js unchanged.');
  process.exit(0);
}

// One site per line keeps the file small and the git diffs readable
const body = [
  '// Generado por scripts/fetch-live.mjs en GitHub Actions. No lo edites a mano.',
  'window.ATUS_LIVE = {',
  ` "updated": ${JSON.stringify(now)},`,
  ` "sources": ${JSON.stringify(sources)},`,
  ' "items": [',
  items.map(i => '  ' + JSON.stringify(i)).join(',\n'),
  ' ]',
  '};',
  '',
].join('\n');
await writeFile(OUT, body);
console.log(`Wrote ${items.length} items (${items.length - previous.items.length >= 0 ? '+' : ''}${items.length - previous.items.length}).`);
