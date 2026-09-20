import fs from 'fs';
const UA = { 'User-Agent': 'Schilderwald-Lernapp/1.0 (private Lernhilfe)' };
const warte = ms => new Promise(r => setTimeout(r, ms));
const liste = JSON.parse(fs.readFileSync('liste-png.json', 'utf8'));
fs.mkdirSync('png', { recursive: true });
let ok = 0; const fehler = [];
for (const x of liste) {
  const ziel = `png/${x.id}.png`;
  if (fs.existsSync(ziel) && fs.statSync(ziel).size > 200) { ok++; continue; }
  if (!/^https:\/\/(thumb|upload)\.wikimedia\.org\/wikipedia\/commons\/thumb\//.test(x.thumb)) { fehler.push(x.id + ' unerwartete URL'); continue; }
  let fertig = false, abbruch = false;
  for (let v = 0; v < 4 && !fertig; v++) {
    const r = await fetch(x.thumb, { headers: UA });
    if (r.status === 429) {
      const ra = Number(r.headers.get('retry-after')) || 60;
      console.log(x.id, '429, warte', ra);
      if (ra > 120) { fehler.push(x.id + ' 429 lang'); abbruch = true; break; }
      await warte(ra * 1000); continue;
    }
    if (!r.ok) { fehler.push(x.id + ' HTTP ' + r.status); break; }
    const typ = r.headers.get('content-type') || '';
    if (!/image\/png/.test(typ)) { fehler.push(x.id + ' Typ ' + typ); break; }
    fs.writeFileSync(ziel, Buffer.from(await r.arrayBuffer())); ok++; fertig = true;
    if (ok % 40 === 0) console.log('geladen', ok);
  }
  if (abbruch) break;
  await warte(3000);
}
console.log('FERTIG', ok, 'von', liste.length, 'Fehler', JSON.stringify(fehler));
