// Reads and writes data.js keeping its layout: top-level keys at two spaces, each reference
// (and each source and folder) as a block with one key per line, values and lists inline.
// No Node APIs, so the site can load it too (that's how the round trip gets checked).

export function splitData(src) {
  const start = src.indexOf('{', src.indexOf('window.ATUS_DATA'));
  const end = src.lastIndexOf('}');
  return { head: src.slice(0, start), data: JSON.parse(src.slice(start, end + 1)), tail: src.slice(end + 1) };
}

const val = v => JSON.stringify(v);
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const block = (o, pad) => `${pad}{\n` + Object.entries(o).map(([k, v]) => `${pad}  ${val(k)}: ${val(v)}`).join(',\n') + `\n${pad}}`;

export function serializeData({ head, data, tail }) {
  const top = Object.entries(data).map(([k, v]) => {
    if (Array.isArray(v) && v.length && v.every(isObj)) return `  ${val(k)}: [\n` + v.map(o => block(o, '    ')).join(',\n') + '\n  ]';
    if (isObj(v)) return `  ${val(k)}: {\n` + Object.entries(v).map(([k2, v2]) => `    ${val(k2)}: ${val(v2)}`).join(',\n') + '\n  }';
    return `  ${val(k)}: ${val(v)}`;
  });
  return head + '{\n' + top.join(',\n') + '\n}' + tail;
}

// Same rule as the site (app.js siteKey): shared hosts are told apart by path, the rest by host
const SHARED_HOSTS = /(^|\.)(behance\.net|dribbble\.com|instagram\.com|pinterest\.[a-z.]+|x\.com|twitter\.com|youtube\.com|vimeo\.com|medium\.com|github\.com|notion\.so|awwwards\.com|framer\.com|linkedin\.com)$/;
export const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
export function siteKey(u) {
  const h = hostOf(u);
  if (!SHARED_HOSTS.test(h)) return h;
  try { return h + new URL(u).pathname.replace(/\/+$/, '').toLowerCase(); } catch { return h; }
}
export const isSharedHost = u => SHARED_HOSTS.test(hostOf(u));
export const slugify = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
