// Zeichnet das App-Symbol (blaues Feld, Gefahrzeichen-Dreieck mit Pfosten) als PNG – ohne Pakete.
// Aufruf: node werkzeuge/icons-bauen.mjs
import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const ziel = path.join(hier, '..', 'app', 'icons');
fs.mkdirSync(ziel, { recursive: true });

const BLAU = [10, 78, 155], WEISS = [255, 255, 255], ROT = [200, 16, 46];

// Formen im Einheitsquadrat 0..1; maskierbar = Inhalt in der inneren Sicherheitszone
function formen(maskierbar) {
  const s = maskierbar ? 0.72 : 0.86, o = (1 - s) / 2;
  const p = (x, y) => [o + x * s, o + y * s];
  return [
    { typ: 'dreieck', punkte: [p(.5, .14), p(.88, .78), p(.12, .78)], farbe: WEISS },
    { typ: 'dreieck', punkte: [p(.5, .30), p(.74, .72), p(.26, .72)], farbe: ROT },
    { typ: 'rechteck', a: p(.465, .70), b: p(.535, .92), farbe: WEISS }
  ];
}
const kreuz = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function inDreieck(pt, [a, b, c]) {
  const d1 = kreuz(a, b, pt), d2 = kreuz(b, c, pt), d3 = kreuz(c, a, pt);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}
function inAbgerundet(x, y, r) {           // Quadrat mit runden Ecken (Radius r)
  const cx = Math.min(Math.max(x, r), 1 - r), cy = Math.min(Math.max(y, r), 1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function bild(groesse, maskierbar) {
  const fs_ = formen(maskierbar);
  const daten = Buffer.alloc((groesse * 4 + 1) * groesse);
  const N = 4;                                  // Unterabtastung je Achse
  for (let y = 0; y < groesse; y++) {
    const zeile = y * (groesse * 4 + 1);
    daten[zeile] = 0;
    for (let x = 0; x < groesse; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < N; sy++) for (let sx = 0; sx < N; sx++) {
        const u = (x + (sx + .5) / N) / groesse, v = (y + (sy + .5) / N) / groesse;
        if (!maskierbar && !inAbgerundet(u, v, .2)) continue;
        let f = BLAU;
        for (const form of fs_) {
          const drin = form.typ === 'dreieck' ? inDreieck([u, v], form.punkte)
            : u >= form.a[0] && u <= form.b[0] && v >= form.a[1] && v <= form.b[1];
          if (drin) f = form.farbe;
        }
        r += f[0]; g += f[1]; b += f[2]; a += 255;
      }
      const n = N * N, i = zeile + 1 + x * 4;
      const deckung = a / n;
      daten[i] = deckung ? Math.round(r * 255 / a) : 0;
      daten[i + 1] = deckung ? Math.round(g * 255 / a) : 0;
      daten[i + 2] = deckung ? Math.round(b * 255 / a) : 0;
      daten[i + 3] = Math.round(deckung);
    }
  }
  return png(groesse, groesse, daten);
}

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc32(buf) { let c = -1; for (const byte of buf) c = CRC[(c ^ byte) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function block(typ, inhalt) {
  const kopf = Buffer.alloc(4); kopf.writeUInt32BE(inhalt.length);
  const t = Buffer.from(typ, 'latin1');
  const pruef = Buffer.alloc(4); pruef.writeUInt32BE(crc32(Buffer.concat([t, inhalt])));
  return Buffer.concat([kopf, t, inhalt, pruef]);
}
function png(w, h, roh) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), block('IHDR', ihdr),
    block('IDAT', zlib.deflateSync(roh, { level: 9 })), block('IEND', Buffer.alloc(0))]);
}

const auftraege = [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-180.png', 180, true],
  ['maskable-512.png', 512, true], ['favicon-32.png', 32, false]];
for (const [name, g, m] of auftraege) fs.writeFileSync(path.join(ziel, name), bild(g, m));
console.log('Symbole geschrieben:', auftraege.map(a => a[0]).join(', '));
