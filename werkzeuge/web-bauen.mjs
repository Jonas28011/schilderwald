// Schreibt den Service Worker (app/sw.js) mit der Liste aller App-Dateien und einer
// Versionsnummer aus dem Inhalt, und baut die Artefakt-Fassung (artefakt/index.html).
// Aufruf nach jeder Änderung: node werkzeuge/web-bauen.mjs
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const wurzel = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = path.join(wurzel, 'app');

// 1. Dateiliste und Version
const dateien = [];
(function sammle(ordner, praefix) {
  for (const e of fs.readdirSync(ordner, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = praefix + e.name;
    if (e.isDirectory()) sammle(path.join(ordner, e.name), rel + '/');
    else if (rel !== 'sw.js') dateien.push(rel);
  }
})(app, '');
const hash = crypto.createHash('sha256');
const TEXT = /\.(js|html|json|webmanifest|txt|css)$/i;
for (const d of dateien) {
  // Zeilenenden vereinheitlichen, damit Windows und Linux dieselbe Version ergeben
  const inhalt = fs.readFileSync(path.join(app, d));
  hash.update(d).update(TEXT.test(d) ? inhalt.toString('utf8').replace(/\r\n/g, '\n') : inhalt);
}
const version = hash.digest('hex').slice(0, 12);
const liste = ['./', ...dateien.filter(d => d !== 'index.html')];

const sw = `/* Schilderwald – Service Worker (erzeugt von werkzeuge/web-bauen.mjs, nicht von Hand ändern) */
const VERSION = 'schilderwald-${version}';
const DATEIEN = ${JSON.stringify(liste, null, 0).replace(/","/g, '",\n  "')};

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(namen => Promise.all(namen.filter(n => n.startsWith('schilderwald-') && n !== VERSION).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(treffer => treffer || fetch(e.request).then(antwort => {
      if (antwort.ok) { const kopie = antwort.clone(); caches.open(VERSION).then(c => c.put(e.request, kopie)); }
      return antwort;
    }))
  );
});
`;
fs.writeFileSync(path.join(app, 'sw.js'), sw);

// 2. Artefakt-Fassung: ohne Dokumentgerüst und ohne die nur-web-Teile
const html = fs.readFileSync(path.join(app, 'index.html'), 'utf8');
let artefakt = html
  .replace(/<!-- nur-web -->[\s\S]*?<!-- \/nur-web -->\n?/g, '')
  .replace(/^<!doctype html>\s*<html[^>]*>\s*<head>\s*/i, '')
  .replace(/^<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*/i, '')
  .replace(/<\/head>\s*<body>\s*/i, '\n')
  .replace(/\s*<\/body>\s*<\/html>\s*$/i, '\n');
if (/<(html|head|body)[\s>]/i.test(artefakt)) throw new Error('Artefakt-Fassung enthält noch Dokumentgerüst');
fs.mkdirSync(path.join(wurzel, 'artefakt'), { recursive: true });
fs.writeFileSync(path.join(wurzel, 'artefakt', 'index.html'), artefakt);

console.log(`sw.js: Version ${version}, ${liste.length} Dateien · artefakt/index.html geschrieben`);
