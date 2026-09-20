/* Prüft die Vorfahrt-Regeln ohne Browser: node werkzeuge/vorfahrt-pruefung.cjs
   Jeder Fall nennt die erwartete Reihenfolge; „+“ heißt gleichzeitig, „>“ danach. */
const fs = require('fs');

global.window = global;
global.Zeichen = { knick: () => ({ vb: '0 0 1 1', body: '' }), teil: () => ({ vb: '0 0 1 1', body: '' }), eingebettet: () => '' };
const src = fs.readFileSync(__dirname + '/../app/vorfahrt.js', 'utf8');
const ctx = {};
new Function('window', src.replace('global.Vorfahrt = {', 'global.__intern = { analysiere, konflikt, vorrang };\n    global.Vorfahrt = {'))(ctx);
const { analysiere } = ctx.__intern;

const WEG = { rechts: 1, gerade: 2, links: 3 };
const F = (arm, weg, name, art = 'auto', spur = 'fahrbahn') =>
  ({ arm, weg, aus: (arm + WEG[weg]) % 4, farbe: { name }, art, spur });
const ALLE = [0, 1, 2, 3];
let fehler = 0;

function fall(titel, lage, erwartet) {
  const a = analysiere(lage);
  const got = a.blockiert ? 'BLOCKIERT' : a.stufen.map(s => s.map(f => f.farbe.name).sort().join('+')).join(' > ');
  const ok = got === erwartet;
  if (!ok) fehler++;
  console.log((ok ? 'OK    ' : 'FALSCH') + ' ' + titel + ': ' + got + (ok ? '' : '  (erwartet ' + erwartet + ')'));
}
const rvl = (fz, arme = ALLE) => ({ typ: 'rvl', arme, haupt: null, warte: '205', steuerung: null, fahrzeuge: fz });
const vfs = (fz, haupt, arme = ALLE) => ({ typ: 'gerade', arme, haupt, warte: '205', steuerung: null, fahrzeuge: fz });
const knick = (fz, haupt) => ({ typ: 'knick', arme: ALLE, haupt, warte: '206', steuerung: null, fahrzeuge: fz });
const geregelt = (fz, steuerung, haupt = null) =>
  ({ typ: haupt ? 'gerade' : 'rvl', arme: ALLE, haupt, warte: '205', steuerung, fahrzeuge: fz });

console.log('— Grundregeln —');
fall('rechts vor links, beide geradeaus', rvl([F(0, 'gerade', 'A'), F(1, 'gerade', 'B')]), 'B > A');
fall('Linksabbieger vor Gegenverkehr', rvl([F(0, 'links', 'A'), F(2, 'gerade', 'B')]), 'B > A');
fall('zwei Linksabbieger gegenüber fahren voreinander', rvl([F(0, 'links', 'A'), F(2, 'links', 'B')]), 'A+B');
fall('Rechtsabbieger und Gegenverkehr, der links abbiegt', rvl([F(0, 'rechts', 'A'), F(2, 'links', 'B')]), 'A > B');
fall('von links kommendes Fahrzeug wartet', rvl([F(0, 'rechts', 'A'), F(3, 'gerade', 'C')]), 'A > C');
fall('T-Kreuzung ohne Nordarm', rvl([F(0, 'links', 'A'), F(1, 'gerade', 'B')], [0, 1, 3]), 'B > A');
fall('vier Fahrzeuge geradeaus blockieren sich', rvl([F(0, 'gerade', 'A'), F(1, 'gerade', 'B'), F(2, 'gerade', 'C'), F(3, 'gerade', 'D')]), 'BLOCKIERT');

console.log('— Vorfahrtstraße —');
fall('Vorfahrtstraße geradeaus', vfs([F(0, 'links', 'A'), F(2, 'gerade', 'B'), F(1, 'gerade', 'C')], [0, 2]), 'B > A > C');
fall('abknickend: wer den Verlauf verlässt, wartet', knick([F(0, 'links', 'A'), F(3, 'gerade', 'B')], [0, 3]), 'A > B');
fall('abknickend: beide folgen dem Verlauf', knick([F(0, 'links', 'A'), F(3, 'rechts', 'B'), F(1, 'gerade', 'C')], [0, 3]), 'A+B > C');
fall('abknickend: Wartepflichtige untereinander rechts vor links', knick([F(1, 'gerade', 'O'), F(2, 'gerade', 'N')], [0, 3]), 'N > O');

console.log('— Ampel und Polizei —');
fall('Grün vor Rot', geregelt([F(0, 'gerade', 'A'), F(1, 'gerade', 'B')], { typ: 'ampel', frei: [0, 2] }), 'A > B');
fall('beide Grün: Linksabbieger lässt Gegenverkehr', geregelt([F(0, 'links', 'A'), F(2, 'gerade', 'B')], { typ: 'ampel', frei: [0, 2] }), 'B > A');
fall('Ampel geht der Vorfahrtstraße vor', geregelt([F(0, 'gerade', 'A'), F(1, 'gerade', 'B')], { typ: 'ampel', frei: [0, 2] }, [1, 3]), 'A > B');
fall('Polizist gibt die Querrichtung frei', geregelt([F(1, 'gerade', 'A'), F(0, 'gerade', 'B')], { typ: 'polizei', frei: [1, 3] }), 'A > B');
fall('gelbes Blinklicht: Schilder gelten weiter',
  { typ: 'gerade', arme: ALLE, haupt: [1, 3], warte: '205', steuerung: { typ: 'blinken' }, fahrzeuge: [F(0, 'gerade', 'A'), F(1, 'gerade', 'B')] }, 'B > A');

console.log('— Sonderfälle —');
fall('Blaulicht und Einsatzhorn zuerst', rvl([F(0, 'gerade', 'A', 'einsatz'), F(1, 'gerade', 'B')]), 'A > B');
fall('Blaulicht schlägt auch die Vorfahrtstraße', vfs([F(1, 'gerade', 'A', 'einsatz'), F(0, 'gerade', 'B')], [0, 2]), 'A > B');
fall('Rechtsabbieger lässt Radfahrer geradeaus durch',
  rvl([F(0, 'rechts', 'Auto'), F(0, 'gerade', 'Rad', 'rad', 'radweg')]), 'Rad > Auto');
fall('Linksabbieger kreuzt den eigenen Radweg nicht',
  rvl([F(0, 'links', 'Auto'), F(0, 'gerade', 'Rad', 'rad', 'radweg'), F(2, 'gerade', 'Gegen')]), 'Gegen+Rad > Auto');
fall('Straßenbahn als Gegenverkehr', rvl([F(0, 'links', 'A'), F(2, 'gerade', 'Tram', 'tram')]), 'Tram > A');
fall('Straßenbahn hat ohne Schild keinen Vorrang vor rechts',
  rvl([F(0, 'gerade', 'Tram', 'tram'), F(1, 'gerade', 'B')]), 'B > Tram');

console.log('— Erzeugte Lagen —');
for (const modus of ['rvl', 'gerade', 'knick', 'ampel', 'sonder', 'gemischt']) {
  let n = 0; const arten = new Set();
  for (let i = 0; i < 200; i++) {
    const l = ctx.Vorfahrt.neueLage(modus);
    if (!l) continue;
    n++;
    l.fahrzeuge.forEach(f => arten.add(f.art));
    if (l.steuerung) arten.add(l.steuerung.typ);
    if (!ctx.Vorfahrt.pruefe(l, l.analyse.stufen.flat()).richtig) {
      console.log('FALSCH ' + modus + ': die eigene Lösung wird nicht akzeptiert'); fehler++; break;
    }
  }
  const ok = n === 200;
  if (!ok) fehler++;
  console.log((ok ? 'OK    ' : 'FALSCH') + ` ${modus}: ${n}/200 Lagen, enthält ${[...arten].sort().join(', ')}`);
}

console.log(fehler ? `\n${fehler} FEHLER` : '\nALLES GRUEN');
process.exit(fehler ? 1 : 0);
