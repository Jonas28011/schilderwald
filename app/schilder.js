/* Schilderwald – Verkehrszeichen als SVG.
   Eigene, vereinfachte Zeichnungen nach den Anlagen 1 bis 3 der StVO.
   Jede Zeichnung liegt in einer eigenen viewBox; Sinnbilder sind in einem
   100 x 100-Feld entworfen und werden in den Rahmen eingepasst. */
(function (global) {
  'use strict';

  const C = {
    rot: '#C8102E', blau: '#0A4E9B', gelb: '#F5C400', gruen: '#00824A',
    schwarz: '#161616', weiss: '#FFFFFF', grau: '#8E8E8E', orange: '#F08A00',
    asphalt: '#565C64', rand: 'rgba(0,0,0,.2)'
  };
  const FONT = "'Barlow Semi Condensed','Arial Narrow',Arial,sans-serif";
  const r1 = n => Math.round(n * 10) / 10;

  const line = (pts, w, col, cap = 'round') =>
    `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="${cap}" stroke-linejoin="round"/>`;
  const path = (d, fill, more = '') => `<path d="${d}" fill="${fill}" ${more}/>`;
  const stroke = (d, w, col, cap = 'round') =>
    `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="${cap}" stroke-linejoin="round"/>`;
  const circle = (x, y, r, fill, more = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${more}/>`;
  const ring = (x, y, r, col, w) => circle(x, y, r, 'none', `stroke="${col}" stroke-width="${w}"`);
  const rect = (x, y, w, h, fill, rx = 0, more = '') =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${more}/>`;
  const poly = (pts, fill) => `<polygon points="${pts}" fill="${fill}"/>`;
  const text = (x, y, size, t, fill, weight = 600, more = '') =>
    `<text x="${x}" y="${y}" font-size="${size}" font-family="${FONT}" font-weight="${weight}" text-anchor="middle" fill="${fill}" ${more}>${t}</text>`;
  const group = (tr, body, more = '') => `<g transform="${tr}" ${more}>${body}</g>`;
  /* Sinnbild (100 x 100) mit Mittelpunkt (cx, cy) und Maßstab s einsetzen */
  const place = (cx, cy, s, body, rot = 0) =>
    group(`translate(${cx} ${cy})${rot ? ` rotate(${rot})` : ''} scale(${s}) translate(-50 -50)`, body);
  const outlined = (body, col, w = 6) =>
    `<g stroke="${col}" stroke-width="${w}" stroke-linejoin="round" paint-order="stroke">${body}</g>`;

  /* Pfeil: Schaft d endet an der Basis der Spitze */
  function arrow(d, tip, angle, col, w = 12, hl = 20, hw = 30) {
    const a = angle * Math.PI / 180, cx = Math.cos(a), sy = Math.sin(a);
    const bx = tip[0] - hl * cx, by = tip[1] - hl * sy;
    const px = -sy * hw / 2, py = cx * hw / 2;
    return stroke(d, w, col, 'butt') +
      poly(`${r1(tip[0])},${r1(tip[1])} ${r1(bx + px)},${r1(by + py)} ${r1(bx - px)},${r1(by - py)}`, col);
  }

  /* ---------- Sinnbilder ---------- */
  const P = {};
  P.ausrufe = f => path('M41 4 H59 L55 66 H45 Z', f) + circle(50, 84, 9, f);
  P.kreuzung = f => line('26,22 74,78', 9, f, 'butt') + line('74,22 26,78', 9, f, 'butt');
  P.vorfahrtKreuz = f => path('M43 98 V20 L50 4 L57 20 V98 Z', f) + rect(16, 40, 68, 8, f);
  P.kurve = f => stroke('M60 96 V56 Q60 36 40 36 H34', 12, f, 'butt') + poly('8,36 34,18 34,54', f);
  P.doppelkurve = f => stroke('M56 98 V82 C56 64 32 68 32 50 C32 34 56 40 56 28', 11, f, 'butt') + poly('56,4 41,30 71,30', f);
  P.gefaelle = f => path('M8 34 L8 92 L92 92 Z', f) + text(62, 44, 28, '10%', f, 700);
  P.steigung = f => path('M92 34 L92 92 L8 92 Z', f) + text(38, 44, 28, '10%', f, 700);
  P.uneben = f => rect(4, 74, 92, 9, f) + path('M12 76 Q27 44 42 76 Z', f) + path('M58 76 Q73 44 88 76 Z', f);
  P.verengt = f => line('28,98 28,70 42,48 42,6', 9, f, 'butt') + line('72,98 72,70 58,48 58,6', 9, f, 'butt');
  P.verengtRechts = f => line('32,98 32,6', 9, f, 'butt') + line('72,98 72,66 54,44 54,6', 9, f, 'butt');
  P.gegenverkehr = (f, g = f) =>
    arrow('M34 8 V68', [34, 94], 90, f, 10, 26, 28) + arrow('M66 92 V32', [66, 6], -90, g, 10, 26, 28);
  P.ampel = () => circle(50, 18, 14, '#D7141A') + circle(50, 50, 14, '#F4B400') + circle(50, 82, 14, '#11923B');

  P.autoFront = (f, b = '#fff') =>
    path('M27 22 Q29 17 34 17 H66 Q71 17 73 22 L83 44 H17 Z', f) +
    path('M33 25 H67 L75 42 H25 Z', b) +
    rect(8, 42, 84, 28, f, 7) +
    circle(22, 55, 6, b) + circle(78, 55, 6, b) + rect(38, 53, 24, 5, b, 2) +
    rect(12, 66, 18, 17, f, 4) + rect(70, 66, 18, 17, f, 4);
  P.lkwFront = (f, b = '#fff') =>
    rect(18, 10, 64, 62, f, 5) + rect(26, 18, 48, 22, b, 3) +
    circle(30, 56, 5, b) + circle(70, 56, 5, b) +
    rect(20, 70, 17, 17, f, 3) + rect(63, 70, 17, 17, f, 3);
  P.lkwSeite = (f, b = '#fff') =>
    rect(36, 20, 60, 46, f, 2) + path('M4 68 V44 L13 30 H32 V68 Z', f) + path('M9 45 L16 35 H28 V45 Z', b) +
    rect(4, 60, 92, 9, f) +
    [18, 70, 86].map(x => circle(x, 74, 9, f, `stroke="${b}" stroke-width="2.5"`)).join('');
  P.motorrad = f =>
    ring(20, 72, 13, f, 6) + ring(80, 72, 13, f, 6) +
    path('M28 60 L40 46 L62 48 L78 54 L88 64 L66 68 H42 Z', f) +
    line('20,72 34,42', 6, f) + line('34,42 30,34 39,31', 5, f) +
    circle(56, 13, 9, f) + line('57,24 64,44', 13, f) + line('58,29 46,36 38,38', 6, f) + line('64,44 56,56 50,62', 8, f);
  P.fahrrad = f =>
    ring(22, 66, 17, f, 5) + ring(78, 66, 17, f, 5) +
    line('22,66 48,66 38,38 22,66', 4.5, f) + line('48,66 68,38 40,38', 4.5, f) +
    line('68,38 78,66', 4.5, f) + line('68,38 65,28 75,26', 4.5, f) + line('31,35 46,35', 6, f);
  P.bus = (f, b = '#fff') =>
    rect(3, 26, 94, 44, f, 8) + [18, 33, 48, 63, 78].map(x => rect(x, 33, 12, 15, b, 2)).join('') +
    rect(7, 33, 7, 22, b, 2) +
    circle(24, 72, 9, f, `stroke="${b}" stroke-width="3"`) + circle(76, 72, 9, f, `stroke="${b}" stroke-width="3"`);
  P.zug = (f, b = '#fff') =>
    stroke('M2 12 H98', 2.5, f) + line('40,34 50,14 60,34', 3, f) +
    path('M12 34 H84 Q95 34 95 45 V70 H5 V41 Q5 34 12 34 Z', f) +
    [11, 30, 49, 68].map(x => rect(x, 40, 14, 12, b, 2)).join('') + rect(84, 40, 7, 12, b, 2) +
    [20, 34, 66, 80].map(x => circle(x, 74, 6, f)).join('') + rect(0, 80, 100, 4, f);
  P.fussgaenger = f =>
    circle(56, 11, 9, f) + line('53,25 47,55', 13, f) + line('47,55 37,74 30,94', 10, f) +
    line('47,55 57,73 67,91', 10, f) + line('52,30 42,44 37,57', 7, f) + line('52,30 62,43 71,50', 7, f);
  P.maedchen = f => P.fussgaenger(f) + path('M47 42 L33 70 H62 Z', f);
  P.kinder = (f, b = '#fff') =>
    group('translate(-2 8) scale(.82)', P.maedchen(f)) +
    outlined(group('translate(42 24) scale(.62)', P.fussgaenger(f)), b, 9);
  P.frauKind = f =>
    circle(34, 11, 9, f) + path('M34 21 Q27 21 25 33 L17 68 H51 L43 33 Q41 21 34 21 Z', f) +
    line('28,66 27,95', 7, f) + line('40,66 41,95', 7, f) + line('27,31 19,54', 6, f) + line('41,31 55,49', 6, f) +
    circle(69, 43, 7.5, f) + line('69,53 69,73', 11, f) + line('67,73 63,95', 6, f) + line('71,73 75,95', 6, f) +
    line('68,57 55,50', 5, f) + line('70,57 79,69', 5, f);
  P.reiter = f =>
    path('M17 52 Q19 40 34 40 H62 Q70 40 74 33 L80 21 Q84 16 89 21 L94 30 Q95 35 90 35 L85 34 L79 48 Q76 59 65 60 H34 Q21 60 17 52 Z', f) +
    line('29,58 22,75 26,92', 6, f) + line('38,58 40,77 34,92', 6, f) +
    line('62,58 71,72 79,82', 6, f) + line('67,58 64,77 66,92', 6, f) +
    stroke('M19 46 Q7 50 8 68', 5, f) +
    circle(49, 9, 7, f) + line('49,17 46,37', 10, f) + line('46,37 57,48 55,57', 6, f) + line('49,22 62,30 76,27', 4, f);
  P.hirsch = f =>
    path('M12 72 Q18 56 36 50 L62 40 Q70 37 72 30 L76 20 Q80 13 87 16 L93 20 Q95 24 90 25 L84 25 L80 37 Q77 47 67 53 L44 65 Q29 73 20 76 Z', f) +
    line('60,48 73,60 85,56', 5, f) + line('66,45 81,51 91,45', 5, f) +
    line('28,68 15,83 5,85', 5, f) + line('35,64 23,85 11,93', 5, f) +
    stroke('M80 16 L75 5 M77 10 L70 6 M85 15 L87 4 M86 9 L93 6', 3, f) + line('13,71 6,64', 4, f);
  P.arbeiter = f =>
    path('M54 94 Q74 52 97 94 Z', f) + circle(28, 15, 9, f) + line('32,27 46,54', 13, f) +
    line('46,54 36,72 30,93', 9, f) + line('46,54 56,72 58,93', 9, f) +
    line('36,34 52,44 60,50', 6, f) + line('30,30 72,76', 4, f) + path('M63 72 L80 69 L83 84 L70 87 Z', f);
  P.schleudern = (f, b = '#fff') =>
    place(64, 32, .58, P.autoFront(f, b), -14) +
    stroke('M30 96 C12 88 42 78 26 64', 5, f) + stroke('M56 96 C38 88 68 78 52 66', 5, f);
  P.windsack = f =>
    line('84,8 84,97', 5, f) +
    path('M84 22 V50 L62 47.4 V24.9 Z', C.rot) + path('M62 24.9 V47.4 L40 44.8 V27.8 Z', '#fff') +
    path('M40 27.8 V44.8 L16 42 V30.8 Z', C.rot) +
    path('M84 22 V50 L16 42 V30.8 Z', 'none', `stroke="${f}" stroke-width="2.5" stroke-linejoin="round"`);
  P.stau = (f, b = '#fff') =>
    ['translate(8 4) scale(.42)', 'translate(22 20) scale(.52)', 'translate(36 36) scale(.62)']
      .map(t => outlined(group(t, P.autoFront(f, b)), b, 7)).join('');
  P.tankwagen = f =>
    rect(30, 22, 64, 30, C.orange, 15, `stroke="${f}" stroke-width="3"`) +
    path('M4 58 V40 L12 28 H27 V58 Z', f) + path('M8 41 L14 32 H23 V41 Z', '#fff') + rect(4, 52, 91, 7, f) +
    [16, 70, 85].map(x => circle(x, 62, 6.5, f)).join('') +
    stroke('M8 78 q7 -6 14 0 t14 0 t14 0 t14 0 t14 0 t14 0', 4, C.blau) +
    stroke('M8 90 q7 -6 14 0 t14 0 t14 0 t14 0 t14 0 t14 0', 4, C.blau);
  P.gefahrgut = f =>
    rect(18, 8, 64, 66, f, 5) + rect(29, 20, 42, 30, C.orange) + rect(29, 34, 42, 2.5, f) +
    rect(20, 72, 17, 17, f, 3) + rect(63, 72, 17, 17, f, 3);
  P.schneekette = b =>
    `<ellipse cx="58" cy="50" rx="27" ry="40" fill="none" stroke="${b}" stroke-width="7"/>` +
    `<ellipse cx="58" cy="50" rx="11" ry="17" fill="none" stroke="${b}" stroke-width="4"/>` +
    line('36,22 48,34 34,48 48,62 38,80', 3.5, b) + line('68,12 80,30 70,50 80,70 68,88', 3.5, b) +
    line('48,34 70,50 48,62', 3, b) + line('48,34 68,12', 3, b) + line('48,62 68,88', 3, b);
  P.haus = f => poly('10,44 50,10 90,44', f) + rect(20, 42, 60, 50, f) ;

  /* ---------- Rahmen ---------- */
  function rimKreis() { return circle(50, 50, 49.4, C.rand) + circle(50, 50, 48.6, '#fff'); }
  function rimRechteck(w, h, r = 7) {
    return rect(0.3, 0.3, w - 0.6, h - 0.6, C.rand, r + 0.6) + rect(1, 1, w - 2, h - 2, '#fff', r);
  }
  const DREIECK_AUSSEN = 'M50 7 L95 85 H5 Z';
  function dreieck(inner) {
    return {
      vb: '0 0 100 90',
      body:
        path(DREIECK_AUSSEN, C.rand, 'stroke="rgba(0,0,0,.2)" stroke-width="9.6" stroke-linejoin="round"') +
        path(DREIECK_AUSSEN, '#fff', 'stroke="#fff" stroke-width="8" stroke-linejoin="round"') +
        path(DREIECK_AUSSEN, C.rot, `stroke="${C.rot}" stroke-width="5" stroke-linejoin="round"`) +
        path('M50 25 L79.4 76 H20.6 Z', '#fff', 'stroke="#fff" stroke-width="1.6" stroke-linejoin="round"') +
        inner
    };
  }
  /* Sinnbild im Dreieck */
  const imDreieck = (body, s = .34, cy = 58) => place(50, cy, s, body);
  function rundRot(inner, fuell = '#fff') {
    return { vb: '0 0 100 100', body: rimKreis() + circle(50, 50, 45.8, C.rot) + circle(50, 50, 36.2, fuell) + inner };
  }
  function rundBlau(inner) {
    return { vb: '0 0 100 100', body: rimKreis() + circle(50, 50, 45.8, C.blau) + inner };
  }
  function streifen(r = 43.6, col = C.schwarz) {
    return [-12, -6, 0, 6, 12].map(o => {
      const d = Math.abs(o) / Math.SQRT2, h = Math.sqrt(r * r - d * d) / Math.SQRT2, m = 50 + o / 2;
      return line(`${r1(m + h)},${r1(m - h)} ${r1(m - h)},${r1(m + h)}`, 2.4, col, 'butt');
    }).join('');
  }
  function ende(inner) {
    return {
      vb: '0 0 100 100',
      body: rimKreis() + circle(50, 50, 45.6, '#fff', `stroke="${C.schwarz}" stroke-width="1.2"`) + inner + streifen()
    };
  }
  function blauQ(inner, w = 100, h = 100) {
    return { vb: `0 0 ${w} ${h}`, body: rimRechteck(w, h) + rect(5, 5, w - 10, h - 10, C.blau, 5) + inner };
  }
  const endeBalken = (w, h) => line(`${w - 8},8 8,${h - 8}`, 7, C.rot, 'butt');
  function zone(innerSign, unter = 'ZONE') {
    return {
      vb: '0 0 90 116',
      body: rimRechteck(90, 116, 6) + rect(4, 4, 82, 108, '#fff', 4, `stroke="${C.schwarz}" stroke-width="2"`) +
        group('translate(15 10) scale(.6)', innerSign.body) +
        text(45, 100, unter.length > 6 ? 13 : 21, unter, C.schwarz, 700)
    };
  }
  function zusatz(inner, w = 100, h = 50) {
    return {
      vb: `0 0 ${w} ${h}`,
      body: rimRechteck(w, h, 5) + rect(4, 4, w - 8, h - 8, '#fff', 3, `stroke="${C.schwarz}" stroke-width="2.4"`) + inner
    };
  }
  function markierung(inner) {
    return { vb: '0 0 100 100', body: rect(0, 0, 100, 100, C.asphalt, 6) + inner };
  }
  function bake(n, farbe = C.rot) {
    let s = rect(2, 2, 26, 116, '#fff', 2, 'stroke="rgba(0,0,0,.28)" stroke-width="1.5"');
    const ys = n === 3 ? [16, 42, 68] : n === 2 ? [26, 58] : [40];
    ys.forEach(y => { s += poly(`3,${y + 14} 27,${y} 27,${y + 10} 3,${y + 24}`, farbe); });
    return s;
  }

  /* Pfeile im Kreisverkehr */
  function kreisPfeile(col) {
    let s = '';
    [70, 190, 310].forEach(a0 => {
      const R = 25, span = 78, a1 = a0 - span;
      const p = a => [50 + R * Math.cos(a * Math.PI / 180), 50 + R * Math.sin(a * Math.PI / 180)];
      const [x0, y0] = p(a0), [x1, y1] = p(a1);
      const t = a1 * Math.PI / 180, tx = Math.sin(t), ty = -Math.cos(t);
      const tip = [x1 + tx * 15, y1 + ty * 15];
      s += stroke(`M${r1(x0)} ${r1(y0)} A${R} ${R} 0 0 0 ${r1(x1)} ${r1(y1)}`, 9, col, 'butt');
      const px = -ty * 12, py = tx * 12;
      s += poly(`${r1(tip[0])},${r1(tip[1])} ${r1(x1 + px)},${r1(y1 + py)} ${r1(x1 - px)},${r1(y1 - py)}`, col);
    });
    return s;
  }

  /* Zusatzzeichen „abknickende Vorfahrt“: rel. Arme 0 unten, 1 rechts, 2 oben, 3 links */
  function knickZusatz(arme, vorfahrt) {
    const E = [[40, 58], [66, 34], [40, 10], [14, 34]];
    let s = rimRechteck(80, 68, 5) + rect(4, 4, 72, 60, '#fff', 3, `stroke="${C.schwarz}" stroke-width="2.4"`);
    arme.forEach(a => { if (!vorfahrt.includes(a)) s += line(`40,34 ${E[a][0]},${E[a][1]}`, 3.2, C.schwarz, 'butt'); });
    s += line(`${E[vorfahrt[0]][0]},${E[vorfahrt[0]][1]} 40,34 ${E[vorfahrt[1]][0]},${E[vorfahrt[1]][1]}`, 8.5, C.schwarz, 'butt');
    return { vb: '0 0 80 68', body: s };
  }

  /* ---------- Katalog der Zeichnungen ---------- */
  const W = C.weiss, K = C.schwarz;
  const D = {
    // Anlage 1 – Gefahrzeichen
    '101': () => dreieck(imDreieck(P.ausrufe(K))),
    '102': () => dreieck(imDreieck(P.kreuzung(K), .32)),
    '103': () => dreieck(imDreieck(P.kurve(K))),
    '105': () => dreieck(imDreieck(P.doppelkurve(K), .35)),
    '108': () => dreieck(imDreieck(P.gefaelle(K), .36, 59)),
    '110': () => dreieck(imDreieck(P.steigung(K), .36, 59)),
    '112': () => dreieck(imDreieck(P.uneben(K), .36, 60)),
    '114': () => dreieck(imDreieck(P.schleudern(K), .36)),
    '117': () => dreieck(imDreieck(P.windsack(K), .36)),
    '120': () => dreieck(imDreieck(P.verengt(K), .36, 57)),
    '121': () => dreieck(imDreieck(P.verengtRechts(K), .36, 57)),
    '123': () => dreieck(imDreieck(P.arbeiter(K), .36)),
    '124': () => dreieck(imDreieck(P.stau(K), .38, 59)),
    '125': () => dreieck(imDreieck(P.gegenverkehr(K), .34)),
    '131': () => dreieck(imDreieck(P.ampel(), .4, 57)),
    '133': () => dreieck(imDreieck(P.fussgaenger(K), .36)),
    '136': () => dreieck(imDreieck(P.kinder(K), .38)),
    '138': () => dreieck(imDreieck(P.fahrrad(K), .38, 61)),
    '142': () => dreieck(imDreieck(P.hirsch(K), .38)),
    '151': () => dreieck(imDreieck(P.zug(K), .38, 61)),
    '156': () => ({ vb: '0 0 100 210', body: group('translate(0 0)', dreieck(imDreieck(P.zug(K), .38, 61)).body) + group('translate(35 88)', bake(3)) }),
    '159': () => ({ vb: '0 0 30 120', body: bake(2) }),
    '162': () => ({ vb: '0 0 30 120', body: bake(1) }),

    // Anlage 2 – Vorschriftzeichen
    '201': () => ({
      vb: '0 0 100 100',
      body: [-56, 56].map(a => group(`translate(50 50) rotate(${a})`,
        rect(-50, -8.5, 100, 17, '#fff', 1, `stroke="${C.rot}" stroke-width="1.6"`) +
        rect(-50, -8.5, 20, 17, C.rot, 1) + rect(30, -8.5, 20, 17, C.rot, 1))).join('')
    }),
    '205': () => ({
      vb: '0 0 100 90',
      body: path('M5 8 H95 L50 86 Z', C.rand, 'stroke="rgba(0,0,0,.2)" stroke-width="9.6" stroke-linejoin="round"') +
        path('M5 8 H95 L50 86 Z', '#fff', 'stroke="#fff" stroke-width="8" stroke-linejoin="round"') +
        path('M5 8 H95 L50 86 Z', C.rot, `stroke="${C.rot}" stroke-width="5" stroke-linejoin="round"`) +
        path('M22.8 18.3 H77.2 L50 65.4 Z', '#fff', 'stroke="#fff" stroke-width="1.6" stroke-linejoin="round"')
    }),
    '206': () => {
      const o = (r) => Array.from({ length: 8 }, (_, i) => {
        const a = (22.5 + 45 * i) * Math.PI / 180; return `${r1(50 + r * Math.cos(a))},${r1(50 + r * Math.sin(a))}`;
      }).join(' ');
      return {
        vb: '0 0 100 100',
        body: `<polygon points="${o(50)}" fill="${C.rand}"/><polygon points="${o(49)}" fill="#fff"/>` +
          `<polygon points="${o(46.5)}" fill="${C.rot}"/><polygon points="${o(43)}" fill="none" stroke="#fff" stroke-width="2"/>` +
          text(50, 61, 31, 'STOP', '#fff', 700, 'letter-spacing="-.5"')
      };
    },
    '208': () => rundRot(place(50, 50, .62, P.gegenverkehr(K, C.rot))),
    '209': () => rundBlau(place(50, 50, .66, arrow('M42 86 V54 Q42 36 60 36 H62', [82, 36], 0, W, 12, 20, 30))),
    '211': () => rundBlau(place(50, 50, .7, arrow('M14 50 H64', [84, 50], 0, W, 12, 20, 30))),
    '214': () => rundBlau(place(50, 50, .66,
      arrow('M38 90 V32', [38, 10], -90, W, 11, 22, 28) + arrow('M38 76 Q38 58 56 58 H64', [84, 58], 0, W, 11, 20, 28))),
    '215': () => rundBlau(kreisPfeile(W)),
    '220': () => ({
      vb: '0 0 124 44',
      body: rimRechteck(124, 44, 4) + rect(4, 4, 116, 36, C.blau, 3) +
        path('M12 14.5 H94 V8 L114 22 L94 36 V29.5 H12 Z', '#fff') +
        text(54, 26.4, 11.5, 'Einbahnstraße', K, 600)
    }),
    '222': () => rundBlau(place(50, 50, .7, arrow('M22 22 L60 60', [76, 76], 45, W, 12, 22, 30))),
    '224': () => ({
      vb: '0 0 100 100',
      body: rimKreis() + circle(50, 50, 45.8, C.gelb) + ring(50, 50, 39.5, C.gruen, 7.5) + text(50, 67, 50, 'H', C.gruen, 700)
    }),
    '229': () => ({
      vb: '0 0 70 100',
      body: rimRechteck(70, 100, 5) + rect(4, 4, 62, 92, C.blau, 4) +
        group('translate(10 8) scale(.5)', rundRot(
          line('23,23 77,77', 7.5, C.rot, 'butt') + line('77,23 23,77', 7.5, C.rot, 'butt'), C.blau).body) +
        text(35, 86, 21, 'TAXI', '#fff', 600)
    }),
    '237': () => rundBlau(place(50, 51, .66, P.fahrrad(W))),
    '238': () => rundBlau(place(50, 52, .64, P.reiter(W))),
    '239': () => rundBlau(place(49, 52, .64, P.frauKind(W))),
    '240': () => rundBlau(place(50, 30, .38, P.frauKind(W)) + rect(12, 49, 76, 3, W) + place(50, 70, .4, P.fahrrad(W))),
    '241': () => rundBlau(place(29, 51, .4, P.fahrrad(W)) + rect(48.5, 8, 3, 84, W) + place(71, 51, .42, P.frauKind(W))),
    '242.1': () => zone(rundBlau(place(49, 52, .64, P.frauKind(W)))),
    '244.1': () => zone(rundBlau(place(50, 51, .66, P.fahrrad(W))), 'Fahrradstraße'),
    '245': () => rundBlau(place(50, 50, .66, P.bus(W, C.blau))),
    '250': () => rundRot(''),
    '251': () => rundRot(place(50, 51, .5, P.autoFront(K))),
    '253': () => rundRot(place(50, 50, .54, P.lkwSeite(K))),
    '254': () => rundRot(place(50, 51, .52, P.fahrrad(K))),
    '255': () => rundRot(place(50, 51, .52, P.motorrad(K))),
    '259': () => rundRot(place(50, 50, .54, P.fussgaenger(K))),
    '260': () => rundRot(place(50, 31, .3, P.motorrad(K)) + rect(15, 48.5, 70, 3, K) + place(50, 68, .32, P.autoFront(K))),
    '261': () => rundRot(place(50, 50, .5, P.gefahrgut(K))),
    '262': () => rundRot(text(50, 63, 36, '5,5<tspan font-size="24">t</tspan>', K, 600)),
    '263': () => rundRot(text(50, 50, 26, '8<tspan font-size="19">t</tspan>', K, 600) +
      rect(24, 62, 52, 5, K) + rect(19, 55, 11, 19, K, 3) + rect(70, 55, 11, 19, K, 3)),
    '264': () => rundRot(text(50, 64, 38, '2<tspan font-size="24">m</tspan>', K, 600) +
      poly('14.5,38 22,50 14.5,62', K) + poly('85.5,38 78,50 85.5,62', K)),
    '265': () => rundRot(text(50, 61, 30, '3,8<tspan font-size="20">m</tspan>', K, 600) +
      poly('38,14.5 50,22 62,14.5', K) + poly('38,85.5 50,78 62,85.5', K)),
    '266': () => rundRot(place(50, 40, .42, P.lkwSeite(K)) +
      line('28,70 72,70', 2, K, 'butt') + poly('22,70 30,66 30,74', K) + poly('78,70 70,66 70,74', K) +
      rect(38, 64, 24, 12, '#fff') + text(50, 74, 13, '10m', K, 600)),
    '267': () => ({
      vb: '0 0 100 100',
      body: rimKreis() + circle(50, 50, 45.8, C.rot) + rect(17, 42.5, 66, 15, '#fff')
    }),
    '268': () => rundBlau(place(50, 50, .7, P.schneekette(W))),
    '269': () => rundRot(place(50, 50, .56, P.tankwagen(K))),
    '270.1': () => zone(rundRot(text(50, 56, 17, 'Umwelt', K, 600))),
    '272': () => rundRot(
      arrow('M36 84 V48 Q36 26 51 26 Q66 26 66 48 V52', [66, 74], 90, K, 10, 22, 26) + line('25,25 75,75', 7, C.rot, 'butt')),
    '273': () => rundRot(text(50, 42, 22, '70<tspan font-size="16">m</tspan>', K, 600) +
      place(34, 62, .24, P.lkwSeite(K)) + place(66, 62, .24, P.lkwSeite(K))),
    '274': () => rundRot(text(50, 65, 44, '60', K, 600)),
    '274.1': () => zone(rundRot(text(50, 65, 44, '30', K, 600))),
    '275': () => rundBlau(text(50, 65, 44, '30', W, 600)),
    '276': () => rundRot(place(31, 51, .38, P.autoFront(C.rot)) + place(69, 51, .38, P.autoFront(K))),
    '277': () => rundRot(place(32, 49, .4, P.lkwFront(C.rot)) + place(69, 52, .36, P.autoFront(K))),
    '277.1': () => rundRot(place(33, 51, .4, P.autoFront(C.rot)) + place(69, 37, .27, P.motorrad(K)) + place(69, 64, .27, P.fahrrad(K))),
    '278': () => ende(text(50, 65, 44, '60', C.grau, 600)),
    '280': () => ende(place(31, 51, .38, P.autoFront(C.grau)) + place(69, 51, .38, P.autoFront(C.grau))),
    '281': () => ende(place(32, 49, .4, P.lkwFront(C.grau)) + place(69, 52, .36, P.autoFront(C.grau))),
    '282': () => ende(''),
    '283': () => rundRot(line('23,23 77,77', 7.5, C.rot, 'butt') + line('77,23 23,77', 7.5, C.rot, 'butt'), C.blau),
    '286': () => rundRot(line('23,23 77,77', 7.5, C.rot, 'butt'), C.blau),
    '290.1': () => zone(rundRot(line('23,23 77,77', 7.5, C.rot, 'butt'), C.blau)),

    // Markierungen
    '293': () => markierung([14, 30, 46, 62, 78].map(x => rect(x, 14, 9, 72, W)).join('')),
    '294': () => markierung(rect(10, 0, 3, 100, W) + rect(87, 0, 3, 100, W) + rect(48.5, 0, 3, 40, W) + rect(10, 40, 41.5, 9, W) + rect(48.5, 58, 3, 16, W)),
    '295': () => markierung(rect(10, 0, 3, 100, W) + rect(87, 0, 3, 100, W) + rect(48, 0, 4, 100, W)),
    '296': () => markierung(rect(10, 0, 3, 100, W) + rect(87, 0, 3, 100, W) + rect(44, 0, 3.5, 100, W) +
      [4, 34, 64, 94].map(y => rect(52.5, y, 3.5, 16, W)).join('') + text(28, 56, 11, 'B', W, 600) + text(72, 56, 11, 'A', W, 600)),
    '297': () => markierung(rect(10, 0, 3, 100, W) + rect(87, 0, 3, 100, W) + rect(48.5, 0, 3, 100, W) +
      arrow('M30 92 V44', [30, 22], -90, W, 5, 14, 14) + arrow('M70 92 V60 Q70 46 60 46 H56', [42, 46], 180, W, 5, 14, 14)),
    '298': () => markierung(rect(10, 0, 3, 100, W) + rect(87, 0, 3, 100, W) +
      path('M50 6 L66 96 H34 Z', 'none', `stroke="${W}" stroke-width="3"`) +
      [30, 44, 58, 72, 86].map(y => line(`${r1(50 - (y - 6) * 16 / 90 + 1)},${y} ${r1(50 + (y - 6) * 16 / 90 - 1)},${y - 12}`, 2.5, W, 'butt')).join('')),
    '299': () => markierung(rect(10, 0, 3, 100, W) + line('20,90 20,10 30,10 38,26 46,10 54,26 62,10 70,26 78,10 84,10 84,90', 3, W)),
    '340': () => markierung(rect(10, 0, 3, 100, W) + rect(87, 0, 3, 100, W) + [-6, 30, 66].map(y => rect(48.5, y, 3, 22, W)).join('')),
    '341': () => markierung(rect(10, 0, 3, 100, W) + rect(87, 0, 3, 100, W) + [12, 28, 44, 60, 76].map(x => rect(x, 46, 11, 7, W)).join('')),
    '342': () => markierung(rect(10, 0, 3, 100, W) + rect(87, 0, 3, 100, W) + [16, 32, 48, 64, 80].map(x => poly(`${x - 5},40 ${x + 5},40 ${x},56`, W)).join('')),

    // Anlage 3 – Richtzeichen
    '301': () => dreieck(imDreieck(P.vorfahrtKreuz(K), .36, 57)),
    '306': () => ({
      vb: '0 0 100 100',
      body: poly('50,0.5 99.5,50 50,99.5 0.5,50', C.rand) + poly('50,1.6 98.4,50 50,98.4 1.6,50', '#fff') +
        poly('50,2.6 97.4,50 50,97.4 2.6,50', 'none').replace('fill="none"', `fill="none" stroke="${K}" stroke-width="1.2"`) +
        poly('50,19 81,50 50,81 19,50', C.gelb)
    }),
    '307': () => ({
      vb: '0 0 100 100',
      body: D['306']().body + [91, 97, 103, 109].map(c =>
        line(`${r1((c + 46) / 2)},${r1((c - 46) / 2)} ${r1((c - 46) / 2)},${r1((c + 46) / 2)}`, 2.6, K, 'butt')).join('')
    }),
    '308': () => blauQ(arrow('M34 20 V62', [34, 80], 90, C.rot, 9, 18, 22) + arrow('M64 86 V36', [64, 14], -90, W, 12, 22, 30)),
    '310': () => ({
      vb: '0 0 140 80',
      body: rimRechteck(140, 80, 5) + rect(4, 4, 132, 72, C.gelb, 4, `stroke="${K}" stroke-width="2.2"`) +
        text(70, 40, 25, 'Neustadt', K, 600) + text(70, 61, 12, 'Kreis Beispiel', K, 600)
    }),
    '311': () => ({
      vb: '0 0 140 80',
      body: rimRechteck(140, 80, 5) + rect(4, 4, 132, 72, C.gelb, 4, `stroke="${K}" stroke-width="2.2"`) +
        text(62, 26, 15, 'Altdorf', K, 600) + text(62, 38, 9, '6 km', K, 600) +
        arrow('M104 34 V22', [104, 11], -90, K, 3, 8, 9) + rect(12, 43, 116, 1.5, K) +
        text(70, 66, 20, 'Neustadt', K, 600) + line('24,70 116,48', 5, C.rot, 'butt')
    }),
    '314': () => blauQ(text(50, 80, 78, 'P', W, 600)),
    '314.1': () => zone(blauQ(text(50, 80, 78, 'P', W, 600))),
    '325.1': () => blauQ(verkehrsberuhigt(), 150, 100),
    '325.2': () => blauQ(verkehrsberuhigt() + endeBalken(150, 100), 150, 100),
    '327': () => blauQ(rect(18, 24, 64, 62, W, 2) + path('M28 86 V54 Q28 34 50 34 Q72 34 72 54 V86 Z', K)),
    '328': () => blauQ(rect(20, 12, 4, 76, W) + [12, 36, 60].map(y => rect(42, y, 4, 16, W)).join('') +
      stroke('M66 88 V70 Q66 64 74 60 Q80 56 80 50 Q80 44 74 40 Q66 36 66 30 V12', 4, W)),
    '330.1': () => blauQ(autobahn()),
    '330.2': () => blauQ(autobahn() + endeBalken(100, 100)),
    '331.1': () => blauQ(place(50, 52, .78, P.autoFront(W, C.blau))),
    '333': () => ({
      vb: '0 0 132 44',
      body: path('M1 1 H112 L131 22 L112 43 H1 Z', C.rand) + path('M2 2 H111.5 L129.6 22 L111.5 42 H2 Z', '#fff') +
        path('M5 5 H110 L125.5 22 L110 39 H5 Z', C.blau) + text(58, 29, 20, 'Ausfahrt', W, 600)
    }),
    '350': () => blauQ(poly('50,12 90,84 10,84', W) +
      [30, 42, 54, 66].map(x => rect(x, 74, 7, 7, K)).join('') + place(50, 55, .36, P.fussgaenger(K))),
    '357': () => blauQ(rect(40, 36, 20, 56, W) + rect(16, 16, 68, 22, C.rot, 0, `stroke="${W}" stroke-width="4"`)),
    '394': () => ({
      vb: '0 0 60 100',
      body: rect(22, 0, 16, 100, '#9AA0A6') + rect(15, 33, 30, 34, '#fff', 2, 'stroke="rgba(0,0,0,.25)" stroke-width="1"') + rect(19, 38, 22, 24, C.rot, 1)
    }),
    '450': () => ({ vb: '0 0 30 120', body: bake(2, C.blau) }),

    // Zusatzzeichen
    'z-knick': () => knickZusatz([0, 1, 2, 3], [0, 3]),
    'z-rad': () => zusatz(place(50, 20, .3, P.fahrrad(K)) +
      line('24,38 76,38', 2.5, K, 'butt') + poly('16,38 26,33 26,43', K) + poly('84,38 74,33 74,43', K)),
    'z-tram': () => zusatz(place(50, 25, .44, P.zug(K))),
    'z-stop': () => zusatz(group('translate(12 9) scale(.32)', D['206']().body) + text(66, 34, 20, '100 m', K, 600)),
    'z-entf': () => zusatz(text(50, 34, 22, '200 m', K, 600)),
    'z-laenge': () => zusatz(text(50, 34, 20, 'auf 800 m', K, 600)),
    'z-radfrei': () => zusatz(place(34, 25, .34, P.fahrrad(K)) + text(72, 33, 20, 'frei', K, 600)),

    // Ampeln, Dauerlichtzeichen, Polizei, Blinklichter
    'l-rot': () => ampel(['#E3262B', 0, 0]),
    'l-rotgelb': () => ampel(['#E3262B', '#F7B500', 0]),
    'l-gelb': () => ampel([0, '#F7B500', 0]),
    'l-gruen': () => ampel([0, 0, '#19A652']),
    'l-pfeil': () => ampel([0, 0, 'pfeil']),
    'l-kreuz': () => dauerlicht(line('30,30 70,70', 11, '#E3262B') + line('70,30 30,70', 11, '#E3262B')),
    'l-runter': () => dauerlicht(arrow('M50 22 V56', [50, 80], 90, '#19A652', 11, 24, 34)),
    'l-schraeg': () => dauerlicht(arrow('M70 28 L42 56', [26, 72], 135, '#F7B500', 11, 24, 34) + blitz(50, 50, 44)),
    'l-polizei-seite': () => polizist(line('26,46 4,46', 8, '#20395E') + line('74,46 96,46', 8, '#20395E') + circle(3, 46, 4.5, '#fff') + circle(97, 46, 4.5, '#fff')),
    'l-polizei-hoch': () => polizist(line('68,46 76,22 78,4', 8, '#20395E') + circle(78, 3, 4.5, '#fff') + line('32,46 28,70 30,88', 8, '#20395E')),
    'l-blau': () => rundumleuchte('#2B6BE0'),
    'l-gelbblink': () => rundumleuchte('#F7B500')
  };

  function ampel(lampen) {
    let s = rect(12, 2, 56, 176, '#1E2328', 10) + rect(18, 8, 44, 164, '#2A3036', 7);
    [36, 90, 144].forEach((cy, i) => {
      const f = lampen[i];
      s += circle(40, cy, 19, '#15191D');
      if (f === 'pfeil') {
        s += circle(40, cy, 17, '#0F1215') + arrow(`M52 ${cy} H40`, [26, cy], 180, '#19A652', 6, 12, 16);
      } else if (f) {
        s += circle(40, cy, 25, f, 'opacity=".22"') + circle(40, cy, 17, f) + circle(34, cy - 6, 5, '#fff', 'opacity=".35"');
      } else {
        s += circle(40, cy, 17, '#3A4148');
      }
    });
    return { vb: '0 0 80 180', body: s };
  }
  function dauerlicht(inner) {
    return { vb: '0 0 100 100', body: rect(2, 2, 96, 96, '#1E2328', 12) + rect(9, 9, 82, 82, '#0F1215', 8) + inner };
  }
  function blitz(cx, cy, r) {
    return [0, 90, 180, 270].map(a => {
      const t = (a + 45) * Math.PI / 180;
      return line(`${r1(cx + Math.cos(t) * r)},${r1(cy + Math.sin(t) * r)} ${r1(cx + Math.cos(t) * (r + 3))},${r1(cy + Math.sin(t) * (r + 3))}`, 3, '#F7B500');
    }).join('');
  }
  function polizist(arme) {
    const s = rect(0, 0, 100, 130, '#E9EEF2', 12) +
      path('M34 36 H66 L70 90 H30 Z', '#2E4A73') + rect(30, 86, 40, 6, '#1B2C45') +
      line('40,92 40,124', 10, '#1B2C45', 'butt') + line('60,92 60,124', 10, '#1B2C45', 'butt') +
      circle(50, 22, 10, '#E8B99A') + path('M37 16 H63 V11 Q50 3 37 11 Z', '#F4F4F4') + rect(36, 15, 28, 3, '#1B2C45') +
      path('M44 38 L50 60 L56 38 Z', '#F4F4F4') + arme;
    return { vb: '0 0 100 130', body: s };
  }
  function rundumleuchte(f) {
    let s = rect(0, 0, 120, 90, '#E9EEF2', 12) + rect(22, 62, 76, 12, '#2A3036', 3) +
      path('M36 62 V44 Q36 22 60 22 Q84 22 84 44 V62 Z', f) + path('M44 58 V46 Q44 30 58 30', 'none', 'stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".55"');
    [[60, 12, 60, 2], [30, 26, 20, 18], [90, 26, 100, 18], [20, 46, 8, 46], [100, 46, 112, 46]].forEach(([a, b, c, d]) => {
      s += line(`${a},${b} ${c},${d}`, 4, f);
    });
    return { vb: '0 0 120 90', body: s };
  }

  function verkehrsberuhigt() {
    return place(125, 48, .44, P.haus(W)) + rect(118, 48, 14, 20, C.blau) +
      place(32, 46, .52, P.fussgaenger(W)) +
      place(74, 64, .34, P.fussgaenger(W)) + circle(94, 78, 5, W) +
      place(74, 30, .3, P.autoFront(W, C.blau));
  }
  function autobahn() {
    return path('M12 94 L44 46 H48 L38 94 Z', W) + path('M62 94 L52 46 H56 L88 94 Z', W) +
      rect(8, 30, 84, 11, W) + rect(14, 41, 6, 14, W) + rect(80, 41, 6, 14, W);
  }

  /* ---------- Ausgabe ---------- */
  const cache = {};
  function bauteil(id) {
    if (!cache[id]) {
      const f = D[id];
      if (!f) throw new Error('Unbekanntes Zeichen ' + id);
      cache[id] = f();
    }
    return cache[id];
  }
  /* Vollständiges <svg> für das Zeichen */
  function svg(id, cls = 'zeichen', label = '') {
    const b = bauteil(id);
    const aria = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
    return `<svg class="${cls}" viewBox="${b.vb}" ${aria} xmlns="http://www.w3.org/2000/svg">${b.body}</svg>`;
  }
  /* Eingebettetes Zeichen an Position x, y (Breite w) für größere Grafiken */
  function eingebettet(teil, x, y, w) {
    const [, , vw, vh] = teil.vb.split(' ').map(Number);
    const h = w * vh / vw;
    return `<svg x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" viewBox="${teil.vb}">${teil.body}</svg>`;
  }

  global.Zeichen = {
    svg,
    hat: id => !!D[id],
    teil: bauteil,
    knick: knickZusatz,
    eingebettet,
    farben: C
  };
})(window);
