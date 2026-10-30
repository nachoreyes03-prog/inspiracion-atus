// The Referencias robot: applies to data.js what the site sends in a GitHub issue. Pages to add
// (screenshots, fonts and colors through capture.mjs), references to take out, ★ sites saved from
// Descubrir, folders, and which references go in each folder. Run by .github/workflows/agregar.yml.
//
// The issue body ends with a ```json block: { adds: [{url, folders}], removes: [id], favs: [{link,
// name, source, image, cats, desc, folders}], folders: {add: [{id, name}], rename: [{id, name}],
// remove: [id]}, refs: {refId: [folderId]}, graphicAdds: [{url, category}], graphicRemoves: [id] }.
// graphic* are the Graphic design resources (mockups, textures, logos, fonts…). Applying it twice changes nothing.
// Issues titled "Agregar: site.com" or "Sacar: Name" (from before folders) still work.
// By hand: Actions → Run workflow with a link and prueba=1 (DRY_RUN) saves nothing; the
// screenshots and the entries go to out/.
// Writes out/reply.md (the answer for the issue) and $GITHUB_OUTPUT: changed (1/0), summary.
import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureSite, idFor, startBrowser } from './capture.mjs';
import { hostOf, serializeData, siteKey, slugify, splitData } from './data-file.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'out');
const DRY = process.env.DRY_RUN === '1';
const today = new Date().toISOString().slice(0, 10);
const arr = v => (Array.isArray(v) ? v : []);
const str = v => (typeof v === 'string' ? v.trim() : '');
const urlOf = s => {
  const m = String(s || '').match(/https?:\/\/[^\s<>"'`]+/i);
  if (!m) return null;
  try { const x = new URL(m[0].replace(/[.,;:!?)\]]+$/, '')); x.hash = ''; return x.href; } catch { return null; }
};

async function output(values) {
  const lines = Object.entries(values).map(([k, v]) => `${k}=${String(v ?? '').replace(/\r?\n/g, ' ')}`).join('\n') + '\n';
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, lines);
  process.stdout.write(lines);
}

function changesFromIssue() {
  const body = process.env.ISSUE_BODY || '', title = process.env.ISSUE_TITLE || '';
  if (process.env.CHANGES) return JSON.parse(process.env.CHANGES);
  if (process.env.URL) return { adds: [{ url: urlOf(process.env.URL) }] };
  const block = body.match(/```json\s*([\s\S]*?)```/);
  if (block) return JSON.parse(block[1]);
  if (/^agregar/i.test(title)) {
    let u = urlOf(body);
    const t = title.replace(/^agregar:?\s*/i, '').trim();
    if (!u && /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t)) u = urlOf('https://' + t);
    return { adds: u ? [{ url: u }] : [] };
  }
  if (/^sacar/i.test(title)) {
    const id = (body.match(/^\s*id:\s*(\S+)/m) || [])[1];
    return { removes: id ? [id] : [] };
  }
  return {};
}

async function main() {
  await mkdir(OUT, { recursive: true });
  let ch;
  try { ch = changesFromIssue(); } catch { ch = null; }
  const reply = [];
  if (!ch || typeof ch !== 'object') {
    await writeFile(path.join(OUT, 'reply.md'), 'No entendí el pedido: el bloque de cambios está roto.');
    await output({ changed: 0, summary: 'error' });
    return;
  }

  const dataFile = path.join(ROOT, 'data.js');
  const before = await readFile(dataFile, 'utf8');
  const parts = splitData(before);
  const data = parts.data;
  data.refs = arr(data.refs);

  /* folders: new ones, new names, deleted ones */
  let folders = arr(data.folders).filter(f => f && f.id && f.name);
  const F = ch.folders && typeof ch.folders === 'object' ? ch.folders : {};
  for (const f of arr(F.add)) {
    const name = str(f && f.name).slice(0, 40), id = slugify((f && f.id) || name);
    if (!id || !name || folders.some(x => x.id === id)) continue;
    folders.push({ id, name });
    reply.push(`Carpeta nueva: **${name}**`);
  }
  for (const f of arr(F.rename)) {
    const x = folders.find(y => f && y.id === f.id), name = str(f && f.name).slice(0, 40);
    if (x && name && x.name !== name) { reply.push(`La carpeta **${x.name}** ahora se llama **${name}**`); x.name = name; }
  }
  const goneFolders = new Set(arr(F.remove).filter(id => folders.some(x => x.id === id)));
  for (const id of goneFolders) reply.push(`Borré la carpeta **${folders.find(x => x.id === id).name}** (sus webs siguen en Referencias)`);
  folders = folders.filter(x => !goneFolders.has(x.id));
  const okFolders = list => [...new Set(arr(list).filter(id => folders.some(x => x.id === id)))];
  const folderNames = ids => ids.map(id => folders.find(x => x.id === id).name).join(', ');
  const setFolders = (r, ids) => { if (ids.length) r.folders = ids; else delete r.folders; };

  /* references taken out */
  const goneShots = [];
  for (const id of arr(ch.removes)) {
    const i = data.refs.findIndex(r => r.id === id);
    if (i < 0) continue;
    const [r] = data.refs.splice(i, 1);
    goneShots.push(...arr(r.shots));
    reply.push(`Saqué **${r.name}**`);
  }

  const graphic = arr(data.graphic).filter(g => g && g.id);

  /* pages added by link: screenshots, fonts and colors */
  const fresh = [];
  const taken = () => new Set([...fresh, ...data.refs].map(r => r.id));
  const adds = arr(ch.adds).map(a => ({ url: urlOf(a && a.url), folders: a && a.folders })).filter(a => a.url);
  let browser = null;
  try {
    for (const a of adds) {
      const same = [...fresh, ...data.refs].find(r => r.url && siteKey(r.url) === siteKey(a.url));
      if (same) {
        setFolders(same, okFolders([...arr(same.folders), ...arr(a.folders)]));
        reply.push(`**${same.name}** ya estaba en Referencias`);
        continue;
      }
      try {
        browser = browser || await startBrowser();
        const s = await captureSite(browser, a.url);
        const id = idFor(a.url, taken());
        const shots = [`img/${id}.jpg`];
        if (s.shot2) shots.push(`img/${id}-2.jpg`);
        // "auto": filled in by the robot; Claude can complete layout, motion, dna and rubro later
        const entry = { id, name: s.name, url: a.url, rubro: '', atus: false, tags: s.tags, likes: '', avoid: '', shots, fonts: s.fonts, palette: s.palette, layout: '', motion: '', stack: s.stack, dna: '', prompt: s.prompt, auto: true };
        const fs = okFolders(a.folders);
        setFolders(entry, fs);
        const dir = DRY ? OUT : path.join(ROOT, 'img');
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, `${id}.jpg`), s.shot1);
        if (s.shot2) await writeFile(path.join(dir, `${id}-2.jpg`), s.shot2);
        if (DRY) await writeFile(path.join(OUT, `${id}.json`), JSON.stringify({ entry, analysis: s.analysis }, null, 2));
        fresh.push(entry);
        reply.push(`Agregué **${s.name}**${fs.length ? ` en ${folderNames(fs)}` : ''}, con capturas, tipografías y colores`);
      } catch (e) {
        reply.push(`No pude agregar ${a.url}: ${e.message}`);
      }
    }

    /* Graphic design resources (mockups, textures, logos, fonts…): taken out, or added with one screenshot */
    for (const id of arr(ch.graphicRemoves)) {
      const i = graphic.findIndex(g => g.id === id);
      if (i < 0) continue;
      const [g] = graphic.splice(i, 1);
      goneShots.push(...arr(g.shots));
      reply.push(`Saqué **${g.name}** de Graphic design`);
    }
    const gAdds = arr(ch.graphicAdds).map(a => ({ url: urlOf(a && a.url), category: str(a && a.category).slice(0, 30) || 'Otros' })).filter(a => a.url);
    for (const a of gAdds) {
      const same = graphic.find(g => g.url && siteKey(g.url) === siteKey(a.url));
      if (same) { reply.push(`**${same.name}** ya estaba en Graphic design`); continue; }
      try {
        browser = browser || await startBrowser();
        const s = await captureSite(browser, a.url);
        const id = 'g-' + idFor(a.url, new Set(graphic.map(g => String(g.id).replace(/^g-/, ''))));
        const dir = DRY ? OUT : path.join(ROOT, 'img');
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, `${id}.jpg`), s.shot1);
        graphic.unshift({ id, name: s.name, url: a.url, category: a.category, note: '', shots: [`img/${id}.jpg`] });
        reply.push(`Agregué **${s.name}** a Graphic design (${a.category})`);
      } catch (e) {
        reply.push(`No pude agregar ${a.url}: ${e.message}`);
      }
    }
  } finally {
    if (browser) await browser.close();
  }
  if (graphic.length || Array.isArray(data.graphic)) data.graphic = graphic;

  /* ★ sites saved from Descubrir: the gallery's page and picture, no screenshot needed */
  let favs = 0;
  for (const f of arr(ch.favs)) {
    const link = urlOf(f && f.link);
    if (!link) continue;
    const same = [...fresh, ...data.refs].find(r => r.url === link);
    if (same) { setFolders(same, okFolders([...arr(same.folders), ...arr(f.folders)])); continue; }
    const name = str(f.name || f.title).slice(0, 80) || hostOf(link);
    const source = str(f.source).slice(0, 40), image = urlOf(f.image), cats = arr(f.cats).map(str).filter(Boolean).slice(0, 5), desc = str(f.desc).slice(0, 400);
    const ids = taken();
    let id = slugify(name).slice(0, 40) || 'web';
    for (let i = 2; ids.has(id); i++) id = id.replace(/-\d+$/, '') + '-' + i;
    const prompt = [
      `Diseñá una web con la dirección visual de ${name} (${link}).`,
      `La guardé de ${source || 'una galería'}${cats.length ? ` (temas: ${cats.join(', ')})` : ''}.`,
      desc ? `Cómo es: ${desc}` : '',
      'Abrí la web y tomá su tipografía, paleta, layout y movimiento como dirección.',
      'Adaptalo a: [tu proyecto].',
    ].filter(Boolean).join('\n');
    const entry = { id, name, url: link, rubro: '', atus: false, tags: [], likes: '', avoid: '', shots: image ? [image] : [], fonts: [], palette: [], layout: '', motion: '', stack: '', dna: '', prompt, source, cats, desc, gallery: true };
    setFolders(entry, okFolders(f.folders));
    fresh.push(entry);
    favs++;
  }
  if (favs) reply.push(`Guardé ${favs} ${favs === 1 ? 'web' : 'webs'} de Descubrir`);
  data.refs = [...fresh, ...data.refs]; // newest first

  /* which folder each reference is in */
  let moved = 0;
  for (const [id, list] of Object.entries(ch.refs && typeof ch.refs === 'object' ? ch.refs : {})) {
    const r = data.refs.find(x => x.id === id);
    if (!r) continue;
    const was = JSON.stringify(arr(r.folders));
    setFolders(r, okFolders(list));
    if (JSON.stringify(arr(r.folders)) !== was) moved++;
  }
  for (const r of data.refs) if (r.folders) setFolders(r, r.folders.filter(id => !goneFolders.has(id)));
  if (moved) reply.push(`Cambié de carpeta ${moved} ${moved === 1 ? 'referencia' : 'referencias'}`);

  /* write it back, folders right after "updated" */
  const next = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === 'folders') continue;
    next[k] = v;
    if (k === 'updated' && folders.length) next.folders = folders;
  }
  const changedSomething = JSON.stringify(next) !== JSON.stringify(splitData(before).data);
  if (changedSomething) next.updated = today;
  const after = serializeData({ head: parts.head, data: next, tail: parts.tail });
  splitData(after); // throws before writing if the file would break

  const site = process.env.SITE || '';
  const text = reply.length ? reply.map(l => `- ${l}`).join('\n') : 'No había nada para cambiar: ya estaba todo así.';
  await writeFile(path.join(OUT, 'reply.md'), text + (changedSomething && site ? `\n\nEn uno o dos minutos está en todos tus dispositivos: ${site}` : ''));

  if (changedSomething && !DRY) {
    await writeFile(dataFile, after);
    // Screenshots of references taken out go too, unless another one uses them
    const used = new Set([...data.refs, ...graphic].flatMap(r => arr(r.shots)));
    for (const shot of goneShots) {
      const file = path.join(ROOT, shot);
      if (/^img\//.test(shot) && !used.has(shot) && existsSync(file)) await rm(file);
    }
    // A new ?v= on data.js so phones don't keep the cached list
    const indexFile = path.join(ROOT, 'index.html');
    const index = await readFile(indexFile, 'utf8');
    await writeFile(indexFile, index.replace(/data\.js\?v=[^"]*/, `data.js?v=${today.replace(/-/g, '')}-r${Date.now() % 100000}`));
  }
  if (DRY) await writeFile(path.join(OUT, 'data.js'), after);
  await output({ changed: changedSomething && !DRY ? 1 : 0, summary: reply[0] ? reply[0].replace(/\*\*/g, '') + (reply.length > 1 ? ` y ${reply.length - 1} más` : '') : 'sin cambios' });
}

// Each page to add can take ~45 s in the browser
const guard = setTimeout(() => { console.error('El robot tardó demasiado'); process.exit(1); }, 20 * 60 * 1000);
main()
  .catch(async e => {
    console.error(e);
    await mkdir(OUT, { recursive: true });
    await writeFile(path.join(OUT, 'reply.md'), `No pude hacerlo: ${e.message}. El detalle está en la pestaña Actions.`);
    await output({ changed: 0, summary: 'error' });
  })
  .finally(() => clearTimeout(guard));
