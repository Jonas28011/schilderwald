global.window = global;
global.Zeichen = { knick: () => ({ vb: '0 0 1 1', body: '' }), teil: () => ({ vb: '0 0 1 1', body: '' }), eingebettet: () => '' };
require(__dirname + '/../app/vorfahrt.js');
// interne Funktionen über neueLage/pruefe testen: Lage von Hand bauen
const src = require('fs').readFileSync(__dirname + '/../app/vorfahrt.js', 'utf8');
const ctx = {}; new Function('window', src.replace("global.Vorfahrt = {", "global.__intern = { analysiere, konflikt, vorrang, virtuell };\n    global.Vorfahrt = {"))(ctx);
const { analysiere } = ctx.__intern;
const WEG = { rechts: 1, gerade: 2, links: 3 };
const F = (arm, weg, name) => ({ arm, weg, aus: (arm + WEG[weg]) % 4, farbe: { name } });
function fall(titel, lage, erwartet) {
  const a = analysiere(lage);
  const got = a.blockiert ? 'BLOCKIERT' : a.stufen.map(s => s.map(f => f.farbe.name).sort().join('+')).join(' > ');
  console.log((got === erwartet ? 'OK   ' : 'FALSCH') + ' ' + titel + ': ' + got + (got === erwartet ? '' : '  (erwartet ' + erwartet + ')'));
}
const rvl = (fz, arme = [0,1,2,3]) => ({ typ: 'rvl', arme, haupt: null, warte: '205', fahrzeuge: fz });
// 1: rechts vor links, zwei geradeaus: B kommt von rechts (Ost) -> B zuerst
fall('rvl geradeaus', rvl([F(0,'gerade','A'), F(1,'gerade','B')]), 'B > A');
// 2: Linksabbieger vs Gegenverkehr geradeaus
fall('links vs gegen', rvl([F(0,'links','A'), F(2,'gerade','B')]), 'B > A');
// 3: zwei Linksabbieger gegenüber: voreinander, gleichzeitig -> kein Konflikt -> nur 1 Stufe
fall('links+links', rvl([F(0,'links','A'), F(2,'links','B')]), 'A+B');
// 4: Rechtsabbieger A, von links kommt C geradeaus (C muss A lassen? C kommt von links -> A hat Vorrang), Kreuzen? A rechts nach Ost, C von West geradeaus nach Ost -> gleiche Ausfahrt
fall('rechts vs von links gerade', rvl([F(0,'rechts','A'), F(3,'gerade','C')]), 'A > C');
// 5: Vorfahrtstraße geradeaus S-N, A (S) links, B (N) gerade, C (O, wartepflichtig) gerade
fall('VFS gerade', { typ: 'gerade', arme: [0,1,2,3], haupt: [0,2], warte: '205', fahrzeuge: [F(0,'links','A'), F(2,'gerade','B'), F(1,'gerade','C')] }, 'B > A > C');
// 6: abknickend S->W. A (S) folgt nach links, B (W) geradeaus nach Ost (verlässt nach links) -> A zuerst
fall('knick verlassen', { typ: 'knick', arme: [0,1,2,3], haupt: [0,3], warte: '205', fahrzeuge: [F(0,'links','A'), F(3,'gerade','B')] }, 'A > B');
// 7: abknickend S->W, A (S) folgt, B (W) folgt nach rechts nach S -> kein Konflikt
fall('knick beide folgen', { typ: 'knick', arme: [0,1,2,3], haupt: [0,3], warte: '205', fahrzeuge: [F(0,'links','A'), F(3,'rechts','B'), F(1,'gerade','C')] }, 'A+B > C');
// 8: abknickend: zwei Wartepflichtige O und N, beide geradeaus: N kommt für O von rechts
fall('knick Wartepflichtige', { typ: 'knick', arme: [0,1,2,3], haupt: [0,3], warte: '206', fahrzeuge: [F(1,'gerade','O'), F(2,'gerade','N')] }, 'N > O');
// 9: T-Kreuzung ohne Nord, rvl: A (S) links nach W, B (O) gerade nach W -> B kommt von rechts
fall('T rvl', rvl([F(0,'links','A'), F(1,'gerade','B')], [0,1,3]), 'B > A');
// 10: Linksabbieger vs entgegenkommender Rechtsabbieger
fall('links vs gegen rechts', rvl([F(0,'links','A'), F(2,'rechts','B')]), 'B > A');
// 11: vier gerade rvl -> blockiert
fall('vier gerade', rvl([F(0,'gerade','A'), F(1,'gerade','B'), F(2,'gerade','C'), F(3,'gerade','D')]), 'BLOCKIERT');
let n = 0; for (let i = 0; i < 300; i++) if (window.Vorfahrt.neueLage('gemischt')) n++;
console.log('erzeugte Lagen:', n, '/ 300');
