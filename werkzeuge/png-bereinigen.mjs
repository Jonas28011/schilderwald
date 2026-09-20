// Behält von jeder PNG-Datei nur Bild- und Farbblöcke (ohne Text- und Zeitblöcke),
// schreibt sie nach ../app/z/ und erzeugt bilder.js mit den Bildmaßen.
import fs from 'fs';
const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const BEHALTEN = new Set(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND', 'gAMA', 'cHRM', 'sRGB', 'bKGD', 'pHYs']);
const liste = JSON.parse(fs.readFileSync('liste-png.json', 'utf8'));
fs.mkdirSync('../app/z', { recursive: true });
const masse = {}; const entfernt = {}; let summe = 0; const fehlt = [];
for (const x of liste) {
  const quelle = `png/${x.id}.png`;
  if (!fs.existsSync(quelle)) { fehlt.push(x.id); continue; }
  const b = fs.readFileSync(quelle);
  if (!b.subarray(0, 8).equals(SIG)) throw new Error(x.id + ': keine PNG-Datei');
  const teile = [SIG];
  let p = 8, w = 0, h = 0;
  while (p < b.length) {
    const len = b.readUInt32BE(p);
    const typ = b.toString('latin1', p + 4, p + 8);
    const ganz = b.subarray(p, p + 12 + len);
    if (typ === 'IHDR') { w = b.readUInt32BE(p + 8); h = b.readUInt32BE(p + 12); }
    if (BEHALTEN.has(typ)) teile.push(ganz); else entfernt[typ] = (entfernt[typ] || 0) + 1;
    p += 12 + len;
    if (typ === 'IEND') break;
  }
  const neu = Buffer.concat(teile);
  fs.writeFileSync(`../app/z/${x.id}.png`, neu);
  summe += neu.length;
  masse[x.id] = [w, h];
}
const js = '/* Schilderwald – Maße der Zeichenbilder in z/ (Breite, Höhe in Pixeln) */\nwindow.BILDMASSE = {\n' +
  Object.entries(masse).map(([k, v]) => `${JSON.stringify(k)}: [${v[0]}, ${v[1]}]`).join(',\n') + '\n};\n';
fs.writeFileSync('../app/bilder.js', js);
console.log('Bilder', Object.keys(masse).length, 'fehlend', fehlt, 'Summe KB', Math.round(summe / 1024), 'entfernte Blöcke', entfernt);
