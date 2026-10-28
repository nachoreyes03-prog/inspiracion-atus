// Deletes a reference from data.js, and its screenshots, when the "Sacar" button opens an issue.
// Run by .github/workflows/agregar.yml. The issue body is "id: <id>" plus the site's link.
// Results go to $GITHUB_OUTPUT: status (removed | missing | error), name, error.
import { existsSync } from 'node:fs';
import { appendFile, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function output(values) {
  const lines = Object.entries(values).map(([k, v]) => `${k}=${String(v ?? '').replace(/\r?\n/g, ' ')}`).join('\n') + '\n';
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, lines);
  process.stdout.write(lines);
}

const parseData = src => JSON.parse(src.slice(src.indexOf('{', src.indexOf('window.ATUS_DATA')), src.lastIndexOf('}') + 1));
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function main() {
  const body = process.env.ISSUE_BODY || '';
  const id = (body.match(/^\s*id:\s*(\S+)/m) || [])[1];
  const url = (body.match(/https?:\/\/[^\s<>"']+/i) || [])[0];

  const dataFile = path.join(ROOT, 'data.js');
  let src = await readFile(dataFile, 'utf8');
  const data = parseData(src);
  const ref = data.refs.find(r => id && r.id === id)
    || (url && data.refs.find(r => r.url && hostOf(r.url) === hostOf(url) && r.url.replace(/\/+$/, '') === url.replace(/\/+$/, '')));
  if (!ref) { await output({ status: 'missing', name: id || url || '' }); return; }

  // Each reference is a block "    {\n      "id": "…", … \n    }" with no nested objects, so the
  // first "\n    }" after its id closes it. Cutting the text keeps the rest of the file as it was.
  const block = new RegExp(`\\r?\\n {4}\\{\\r?\\n {6}"id": ${escapeRe(JSON.stringify(ref.id))},[\\s\\S]*?\\r?\\n {4}\\}(,?)`);
  const m = src.match(block);
  if (!m) throw new Error('no encontré su bloque en data.js');
  let start = m.index, end = m.index + m[0].length;
  // The last one has no comma after it: take the one before it instead
  if (!m[1]) { const before = src.lastIndexOf(',', start); if (before > -1 && /^\s*$/.test(src.slice(before + 1, start))) start = before; }
  src = src.slice(0, start) + src.slice(end);
  src = src.replace(/"updated":\s*"[^"]*"/, `"updated": "${new Date().toISOString().slice(0, 10)}"`);

  const after = parseData(src); // throws before writing if the file would break
  if (after.refs.length !== data.refs.length - 1 || after.refs.some(r => r.id === ref.id)) throw new Error('el corte en data.js no salió bien');
  await writeFile(dataFile, src);

  // Its screenshots go too, unless another reference uses them
  const used = new Set(after.refs.flatMap(r => Array.isArray(r.shots) ? r.shots : []));
  for (const shot of Array.isArray(ref.shots) ? ref.shots : []) {
    const file = path.join(ROOT, shot);
    if (/^img\//.test(shot) && !used.has(shot) && existsSync(file)) await rm(file);
  }

  // A new ?v= on data.js so phones don't keep the cached list
  const indexFile = path.join(ROOT, 'index.html');
  const index = await readFile(indexFile, 'utf8');
  await writeFile(indexFile, index.replace(/data\.js\?v=[^"]*/, `data.js?v=${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-s${Date.now() % 100000}`));

  await output({ status: 'removed', name: ref.name });
}

main().catch(async e => { console.error(e); await output({ status: 'error', error: e.message }); });
