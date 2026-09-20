import fs from 'fs';
const WEG = new Set(['101-14','101-55','101-10','211-10','214-10','224-51','257-51','257-57','257-58','274.1-20','316','350.2','363','365-52','365-62','385','386.1','391','392','439','448.1','450-50','450-52','457.2','458','466','467.2','620-41','628','629','bue-blinklicht',
 '1000-12','1000-31','1002-11','1002-20','1006-30','1007-31','1007-34','1007-57','1008-31','1010-51','1010-58','1010-59','1010-66','1010-70','1012-35','1020-12','1022-12','1022-16','1024-14','1024-17','1026-36','1028-31','1042-33','1044-10','1053-36','1060-32']);
const UA = { 'User-Agent': 'Schilderwald-Lernapp/1.0 (private Lernhilfe)' };
const warte = ms => new Promise(r => setTimeout(r, ms));
const liste = JSON.parse(fs.readFileSync('liste.json', 'utf8')).filter(x => !WEG.has(x.id));
console.log('Auswahl', liste.length);
const api = async (titles, extra) => {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&titles=' + encodeURIComponent(titles.join('|')) + extra;
  for (let v = 0; v < 3; v++) { const r = await fetch(url, { headers: UA }); const t = await r.text(); if (r.ok && t.startsWith('{')) return JSON.parse(t).query; console.log('API', r.status, t.slice(0, 60)); await warte(90000); } throw new Error('API gesperrt');
};
const titel = x => 'File:' + x.datei.replace(/_/g, ' ');
// 1. Maße holen
const mass = {};
for (let i = 0; i < liste.length; i += 45) {
  const q = await api(liste.slice(i, i + 45).map(titel), '&iiprop=size');
  for (const p of Object.values(q.pages)) mass[p.title] = p.imageinfo[0];
  await warte(5000);
}
// 2. Breite wählen: Standardstufe, Höhe höchstens 700
const STUFEN = [500, 330, 250, 120];
liste.forEach(x => { const m = mass[titel(x)]; x.w = m.width; x.h = m.height; x.stufe = STUFEN.find(s => s * m.height / m.width <= 700) || 120; });
// 3. Thumbnail-URLs über die imageinfo-API holen, gruppiert nach Stufe
for (const s of STUFEN) {
  const gruppe = liste.filter(x => x.stufe === s);
  for (let i = 0; i < gruppe.length; i += 45) {
    const q = await api(gruppe.slice(i, i + 45).map(titel), `&iiprop=url&iiurlwidth=${s}`);
    const byTitle = {}; for (const p of Object.values(q.pages)) byTitle[p.title] = p.imageinfo[0];
    gruppe.slice(i, i + 45).forEach(x => { const ii = byTitle[titel(x)]; x.thumb = ii.thumburl; x.tw = ii.thumbwidth; x.th = ii.thumbheight; });
    await warte(5000);
  }
}
fs.writeFileSync('liste-png.json', JSON.stringify(liste, null, 1));
console.log('Stufen', STUFEN.map(s => s + ':' + liste.filter(x => x.stufe === s).length).join(' '));
// 4. Laden, gemächlich
fs.mkdirSync('png', { recursive: true });
let ok = 0; const fehler = [];
for (const x of liste) {
  const ziel = `png/${x.id}.png`;
  if (fs.existsSync(ziel) && fs.statSync(ziel).size > 200) { ok++; continue; }
  if (!/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\//.test(x.thumb)) { fehler.push(x.id + ' unerwartete URL'); continue; }
  let fertig = false;
  for (let v = 0; v < 4 && !fertig; v++) {
    const r = await fetch(x.thumb, { headers: UA });
    if (r.status === 429) { const ra = Number(r.headers.get('retry-after')) || 60; console.log(x.id, '429, warte', ra); if (ra > 120) { fehler.push(x.id + ' 429 lang'); break; } await warte(ra * 1000); continue; }
    if (!r.ok) { fehler.push(x.id + ' HTTP ' + r.status); break; }
    const typ = r.headers.get('content-type');
    if (!/image\/png/.test(typ)) { fehler.push(x.id + ' Typ ' + typ); break; }
    fs.writeFileSync(ziel, Buffer.from(await r.arrayBuffer())); ok++; fertig = true;
  }
  if (fehler.some(f => f.includes('429 lang'))) break;
  await warte(3000);
}
console.log('FERTIG', ok, 'von', liste.length, 'Fehler', fehler);
