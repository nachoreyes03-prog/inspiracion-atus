// Pulls the newest websites from gallery RSS feeds into live.js.
// Runs every day on GitHub Actions (.github/workflows/live.yml). No dependencies: Node 18+.
import { readFile, writeFile } from 'node:fs/promises';

const OUT = new URL('../live.js', import.meta.url);
const MAX_ITEMS = 400;
// Land-book answers 403 to bot-looking user agents, so present a regular browser one
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const FEEDS = [
  { name: 'Minimal Gallery', url: 'https://minimal.gallery/feed/', home: 'https://minimal.gallery/' },
  { name: 'One Page Love', url: 'https://onepagelove.com/feed', home: 'https://onepagelove.com/' },
  { name: 'Land-book', url: 'https://land-book.com/feed', home: 'https://land-book.com/' },
  { name: 'SiteInspire', url: 'https://www.siteinspire.com/websites/feed', home: 'https://www.siteinspire.com/' },
];
// Categories that say nothing about the design
const SKIP_CATS = /^(uncategorized|inspiration|website inspiration|long screenshot|featured)$/i;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', laquo: '«', raquo: '»' };
const unCdata = s => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
const decode = s => String(s || '')
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
const plain = s => decode(unCdata(s).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const esc = name => name.replace(':', '\\:');
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${esc(name)}(?:\\s[^>]*)?>([\\s\\S]*?)</${esc(name)}>`, 'i')); return m ? m[1] : ''; };
const tags = (xml, name) => [...xml.matchAll(new RegExp(`<${esc(name)}(?:\\s[^>]*)?>([\\s\\S]*?)</${esc(name)}>`, 'gi'))].map(m => m[1]);
const isHttp = u => /^https?:\/\//i.test(u || '');

function imageOf(item) {
  const media = item.match(/<media:content[^>]*\surl="([^"]+)"/i)
    || item.match(/<media:thumbnail[^>]*\surl="([^"]+)"/i)
    || item.match(/<enclosure[^>]*\surl="([^"]+)"[^>]*type="image/i);
  if (media) {
    // SiteInspire serves 1600px crops; ask its image CDN for a card-sized one
    return decode(media[1]).replace('width=1600,height=1000', 'width=960,height=600');
  }
  const html = unCdata(tag(item, 'content:encoded') + ' ' + tag(item, 'description'));
  const srcset = html.match(/srcset="([^"]+)"/i);
  if (srcset) {
    const pick = decode(srcset[1]).split(',')
      .map(part => part.trim().split(/\s+/))
      .map(([u, w]) => ({ u, w: parseInt(w, 10) || 0 }))
      .filter(c => isHttp(c.u) && c.w >= 700)
      .sort((a, b) => a.w - b.w)[0];
    if (pick) return pick.u;
  }
  const img = html.match(/<img[^>]*\ssrc="([^"]+)"/i);
  return img ? decode(img[1]) : '';
}

function parseItem(raw, feed) {
  const link = plain(tag(raw, 'link')) || plain(tag(raw, 'guid'));
  const title = plain(tag(raw, 'title')).replace(/^website inspiration:\s*/i, '');
  if (!isHttp(link) || !title) return null;
  const [name, ...rest] = title.split(/\s+[|–—]\s+/);
  const desc = plain(tag(raw, 'description'))
    .replace(/\s*Full Review\s*$/i, '')
    .replace(/The post .* appeared first on .*$/i, '')
    .trim();
  const date = new Date(plain(tag(raw, 'pubDate')));
  const image = imageOf(raw);
  return {
    title,
    name: name.trim(),
    tagline: rest.join(' – ').trim(),
    desc: desc.length > 240 ? desc.slice(0, 237).replace(/\s+\S*$/, '') + '…' : desc,
    link,
    image: isHttp(image) ? image : '',
    cats: [...new Set(tags(raw, 'category').map(plain).filter(c => c && !SKIP_CATS.test(c)))].slice(0, 6),
    source: feed.name,
    date: isNaN(date) ? new Date().toISOString() : date.toISOString(),
  };
}

async function readFeed(feed) {
  const res = await fetch(feed.url, { headers: { 'user-agent': UA, accept: 'application/rss+xml, application/xml, text/xml, */*' }, signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const items = xml.split(/<item[\s>]/i).slice(1).map(chunk => chunk.split(/<\/item>/i)[0]);
  return items.map(raw => parseItem(raw, feed)).filter(Boolean);
}

async function readPrevious() {
  try {
    const js = await readFile(OUT, 'utf8');
    const json = js.slice(js.indexOf('{'), js.lastIndexOf('}') + 1);
    const data = JSON.parse(json);
    return Array.isArray(data.items) ? data : { items: [] };
  } catch {
    return { items: [] };
  }
}

const previous = await readPrevious();
const byLink = new Map(previous.items.filter(i => i && i.link).map(i => [i.link, i]));
const sources = [];
let okCount = 0;

for (const feed of FEEDS) {
  try {
    const items = await readFeed(feed);
    for (const it of items) byLink.set(it.link, Object.assign({}, byLink.get(it.link), it));
    sources.push({ name: feed.name, home: feed.home, count: items.length, ok: true });
    okCount++;
    console.log(`${feed.name}: ${items.length} items`);
  } catch (err) {
    sources.push({ name: feed.name, home: feed.home, count: 0, ok: false });
    console.warn(`${feed.name}: failed (${err.message})`);
  }
}

if (!okCount) {
  console.error('Every feed failed; keeping the previous live.js.');
  process.exit(1);
}

const items = [...byLink.values()]
  .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  .slice(0, MAX_ITEMS);

if (JSON.stringify(items) === JSON.stringify(previous.items)) {
  console.log('No new websites; live.js unchanged.');
  process.exit(0);
}

const data = { updated: new Date().toISOString(), sources, items };
await writeFile(OUT, `// Generado por scripts/fetch-live.mjs en GitHub Actions. No lo edites a mano.\nwindow.ATUS_LIVE = ${JSON.stringify(data, null, 1)};\n`);
console.log(`Wrote ${items.length} items (${items.length - previous.items.length >= 0 ? '+' : ''}${items.length - previous.items.length}).`);
