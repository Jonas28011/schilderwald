/* Schilderwald – Vorfahrt-Trainer.
   Arme einer Kreuzung: 0 Süd (unten), 1 Ost (rechts), 2 Nord (oben), 3 West (links).
   Vom Arm i aus liegt Arm i+1 rechts, i+2 gegenüber, i+3 links.
   Rangfolge wie in § 36, § 37, § 39 StVO: Polizei vor Ampel vor Schildern vor Grundregeln. */
(function (global) {
  'use strict';

  const ARM_NAME = ['unten', 'rechts', 'oben', 'links'];
  const WEG = { rechts: 1, gerade: 2, links: 3 };
  const WEG_TEXT = { rechts: 'biegt rechts ab', gerade: 'fährt geradeaus', links: 'biegt links ab' };
  const ART_TEXT = { auto: '', tram: 'Straßenbahn, ', rad: 'Fahrrad auf dem Radweg, ', einsatz: 'mit Blaulicht und Einsatzhorn, ' };
  const FARBEN = [
    { name: 'Blau', kurz: 'B', hex: '#2F6FD6' },
    { name: 'Rot', kurz: 'R', hex: '#D8433B' },
    { name: 'Grün', kurz: 'G', hex: '#2E9B5F' },
    { name: 'Gelb', kurz: 'Y', hex: '#E9B200' }
  ];

  const rnd = n => Math.floor(Math.random() * n);
  const pick = a => a[rnd(a.length)];
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = rnd(i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const mod4 = n => ((n % 4) + 4) % 4;
  const norm = v => ((v % 360) + 360) % 360;

  /* ---------- Regeln ---------- */

  /* Fahrwege als Sehnen auf einem Kreis um die Kreuzung (Rechtsverkehr) */
  const armWinkel = i => norm(270 + 90 * i);
  const einfahrt = f => armWinkel(f.arm) + 10;
  const ausfahrt = f => armWinkel(f.aus) - 10;
  const zwischen = (x, a, b) => { const d = norm(x - a); return d > 0 && d < norm(b - a); };
  function konflikt(A, B) {
    if (A.arm === B.arm) {
      // Radweg rechts neben der Fahrbahn: nur der Rechtsabbieger kreuzt ihn
      const rad = A.spur === 'radweg' ? A : B.spur === 'radweg' ? B : null;
      const kfz = rad === A ? B : A;
      return !!rad && kfz.spur !== 'radweg' && kfz.weg === 'rechts';
    }
    if (A.aus === B.aus) return true;
    const a1 = einfahrt(A), a2 = ausfahrt(A);
    return zwischen(einfahrt(B), a1, a2) !== zwischen(ausfahrt(B), a1, a2);
  }

  /* Wie verlässt ein Fahrzeug auf der Vorfahrtstraße deren Verlauf? */
  function virtuell(f, lage) {
    const [p, q] = f.arm === lage.haupt[0] ? lage.haupt : [lage.haupt[1], lage.haupt[0]];
    if (f.aus === q) return 'gerade';
    for (let k = mod4(p + 1); k !== q; k = mod4(k + 1)) if (k === f.aus) return 'rechts';
    return 'links';
  }

  /* Grundregeln: Gegenverkehr beim Abbiegen (§ 9) und rechts vor links (§ 8) */
  function grundregel(A, B) {
    const rel = mod4(B.arm - A.arm);
    if (rel === 2) {
      if (A.weg === 'links' && B.weg !== 'links') return { sieger: B, verlierer: A, grund: 'gegen' };
      if (B.weg === 'links' && A.weg !== 'links') return { sieger: A, verlierer: B, grund: 'gegen' };
      return null;
    }
    if (rel === 1) return { sieger: B, verlierer: A, grund: 'rechts' };
    return { sieger: A, verlierer: B, grund: 'rechts' };
  }

  /* Wer hat Vorrang? Liefert { sieger, verlierer, grund } oder null */
  function vorrang(A, B, lage) {
    // 1. Blaulicht mit Einsatzhorn geht allem vor (§ 38 Abs. 1)
    if ((A.art === 'einsatz') !== (B.art === 'einsatz')) {
      const [s, v] = A.art === 'einsatz' ? [A, B] : [B, A];
      return { sieger: s, verlierer: v, grund: 'blaulicht' };
    }
    // 2. Radweg derselben Zufahrt: Rechtsabbieger lässt den Radverkehr durch (§ 9 Abs. 3)
    if (A.arm === B.arm) {
      const [s, v] = A.spur === 'radweg' ? [A, B] : [B, A];
      return { sieger: s, verlierer: v, grund: 'radweg' };
    }
    // 3. Polizei und Ampel gehen Schildern und Grundregeln vor (§ 36, § 37)
    const st = lage.steuerung;
    if (st && (st.typ === 'ampel' || st.typ === 'polizei')) {
      const frei = f => st.frei.includes(f.arm) ? 1 : 0;
      if (frei(A) !== frei(B)) {
        const [s, v] = frei(A) > frei(B) ? [A, B] : [B, A];
        return { sieger: s, verlierer: v, grund: st.typ };
      }
      return grundregel(A, B);
    }
    // 4. Vorfahrtschilder
    const rang = f => (lage.haupt && lage.haupt.includes(f.arm)) ? 1 : 0;
    if (rang(A) !== rang(B)) {
      const [s, v] = rang(A) > rang(B) ? [A, B] : [B, A];
      return { sieger: s, verlierer: v, grund: 'schild' };
    }
    if (rang(A) === 1) {
      const va = virtuell(A, lage), vb = virtuell(B, lage);
      if (va === 'links' && vb !== 'links') return { sieger: B, verlierer: A, grund: lage.typ === 'knick' ? 'knick' : 'gegen' };
      if (vb === 'links' && va !== 'links') return { sieger: A, verlierer: B, grund: lage.typ === 'knick' ? 'knick' : 'gegen' };
    }
    // 5. Grundregeln
    return grundregel(A, B);
  }

  function analysiere(lage) {
    const f = lage.fahrzeuge, kanten = [];
    for (let i = 0; i < f.length; i++) {
      for (let j = i + 1; j < f.length; j++) {
        if (!konflikt(f[i], f[j])) continue;
        const v = vorrang(f[i], f[j], lage);
        if (v) kanten.push(v);
      }
    }
    /* Stufen: wer fahren darf, sobald alle vor ihm weg sind */
    const rest = new Set(f), stufen = [];
    while (rest.size) {
      const frei = [...rest].filter(x => !kanten.some(k => k.verlierer === x && rest.has(k.sieger)));
      if (!frei.length) return { kanten, stufen, blockiert: true };
      stufen.push(frei);
      frei.forEach(x => rest.delete(x));
    }
    return { kanten, stufen, blockiert: false };
  }

  /* ---------- Lage erzeugen ---------- */
  const fahrzeug = (arm, weg, arme, farbe, art = 'auto', spur = 'fahrbahn') =>
    ({ arm, weg, aus: mod4(arm + WEG[weg]), farbe, art, spur });

  function neueLage(modus) {
    for (let versuch = 0; versuch < 500; versuch++) {
      const lage = bauen(modus === 'gemischt' ? pick(['rvl', 'gerade', 'knick', 'knick', 'ampel', 'sonder']) : modus);
      if (!lage) continue;
      const a = analysiere(lage);
      if (a.blockiert || !a.kanten.length || a.stufen.length < 2) continue;
      lage.analyse = a;
      return lage;
    }
    return null;
  }

  function bauen(modus) {
    const mitAmpel = modus === 'ampel';
    const typ = mitAmpel ? pick(['rvl', 'rvl', 'gerade']) : modus === 'sonder' ? pick(['rvl', 'gerade']) : modus;
    const t = !mitAmpel && Math.random() < (typ === 'knick' ? .25 : .3);
    const fehlt = t ? rnd(4) : -1;
    const arme = [0, 1, 2, 3].filter(a => a !== fehlt);
    let haupt = null;
    if (typ === 'gerade') {
      const opts = arme.filter(a => arme.includes(mod4(a + 2)) && a < 2);
      if (!opts.length) return null;
      const a = pick(opts); haupt = [a, a + 2];
    } else if (typ === 'knick') {
      const opts = arme.filter(a => arme.includes(mod4(a + 1)));
      if (!opts.length) return null;
      const a = pick(opts); haupt = [a, mod4(a + 1)];
    }
    let steuerung = null;
    if (mitAmpel) {
      const art = pick(['ampel', 'ampel', 'ampel', 'polizei', 'polizei', 'blinken']);
      const achse = rnd(2);
      steuerung = art === 'blinken' ? { typ: 'blinken' } : { typ: art, frei: [achse, achse + 2] };
    }
    const warte = pick(['205', '206']);
    const farben = shuffle(FARBEN);
    const wege = arm => Object.keys(WEG).filter(w => arme.includes(mod4(arm + WEG[w])));
    let fahrzeuge = [];

    if (steuerung && steuerung.frei) {
      // zwei Fahrzeuge auf der freigegebenen Achse, höchstens eines bei Rot
      const frei = shuffle(steuerung.frei.map(a => mod4(a)));
      frei.forEach(arm => fahrzeuge.push(fahrzeug(arm, pick(wege(arm)), arme, farben[fahrzeuge.length])));
      if (Math.random() < .6) {
        const rot = pick(arme.filter(a => !steuerung.frei.map(mod4).includes(a)));
        if (rot !== undefined) fahrzeuge.push(fahrzeug(rot, pick(wege(rot)), arme, farben[fahrzeuge.length]));
      }
    } else {
      const anzahl = Math.min(arme.length, pick([2, 3, 3, 4]));
      fahrzeuge = shuffle(arme).slice(0, anzahl).map((arm, i) => fahrzeug(arm, pick(wege(arm)), arme, farben[i]));
    }

    if (modus === 'sonder' || (modus === 'gemischt' && Math.random() < .3)) {
      const art = pick(['tram', 'rad', 'einsatz']);
      if (art === 'einsatz') {
        pick(fahrzeuge).art = 'einsatz';
      } else if (art === 'tram') {
        const kand = fahrzeuge.filter(f => f.weg !== 'rechts');
        if (!kand.length) return null;
        pick(kand).art = 'tram';
      } else {
        // Radfahrer auf dem Radweg derselben Zufahrt wie ein Auto
        const kand = fahrzeuge.filter(f => arme.includes(mod4(f.arm + 2)) && f.art === 'auto');
        if (!kand.length || fahrzeuge.length > 3) return null;
        const auto = pick(kand);
        if (Math.random() < .7) auto.weg = 'rechts';
        if (!arme.includes(mod4(auto.arm + WEG[auto.weg]))) return null;
        auto.aus = mod4(auto.arm + WEG[auto.weg]);
        fahrzeuge.push(fahrzeug(auto.arm, 'gerade', arme, farben[fahrzeuge.length], 'rad', 'radweg'));
      }
    }

    const lage = { typ, arme, haupt, warte, steuerung, fahrzeuge };
    if (haupt && !steuerung && !fahrzeuge.some(x => haupt.includes(x.arm))) return null;
    if (haupt && !steuerung && fahrzeuge.every(x => haupt.includes(x.arm)) && Math.random() < .6) return null;
    return lage;
  }

  /* Eine Antwort (Reihenfolge der Fahrzeuge) ist richtig, wenn sie keiner Vorrangbeziehung widerspricht */
  function pruefe(lage, reihenfolge) {
    const pos = new Map(reihenfolge.map((f, i) => [f, i]));
    const fehler = lage.analyse.kanten.filter(k => pos.get(k.sieger) > pos.get(k.verlierer));
    return { richtig: fehler.length === 0 && reihenfolge.length === lage.fahrzeuge.length, fehler };
  }

  function begruendung(k, lage) {
    const s = k.sieger.farbe.name, v = k.verlierer.farbe.name;
    const bahn = k.sieger.art === 'tram' ? ' Schienenfahrzeuge lässt man beim Abbiegen immer durch (§ 9 Abs. 3).' : '';
    switch (k.grund) {
      case 'blaulicht':
        return `${s} hat Blaulicht und Einsatzhorn: Alle anderen schaffen sofort freie Bahn (§ 38 Abs. 1).`;
      case 'radweg':
        return `${v} biegt rechts ab und muss den geradeaus fahrenden Radverkehr ${s} durchlassen (§ 9 Abs. 3).`;
      case 'ampel':
        return `${s} hat Grün, ${v} hat Rot. Lichtzeichen gehen Vorfahrtschildern und rechts vor links vor (§ 37 Abs. 1).`;
      case 'polizei':
        return `Der Polizist hat die Richtung von ${s} freigegeben; ${v} muss vor der Kreuzung halten (§ 36 Abs. 2).`;
      case 'schild':
        return `${v} kommt aus der untergeordneten Straße (Zeichen ${lage.warte}) und lässt ${s} auf der Vorfahrtstraße zuerst fahren.`;
      case 'rechts':
        return `${s} kommt für ${v} von rechts – rechts vor links (§ 8 Abs. 1).`;
      case 'gegen':
        return `${v} biegt links ab und lässt den Gegenverkehr ${s} durch (§ 9 Abs. 3 und 4).${bahn}`;
      case 'knick':
        return `${v} verlässt den Verlauf der abknickenden Vorfahrtstraße nach links und lässt ${s} als Gegenverkehr auf der Vorfahrtstraße durch (§ 9).${bahn}`;
      default: return '';
    }
  }

  function lageText(lage) {
    const st = lage.steuerung;
    if (st && st.typ === 'ampel') return 'Die Ampel regelt die Kreuzung: Grün für eine Richtung, Rot für die andere. Lichtzeichen gehen Schildern und rechts vor links vor.';
    if (st && st.typ === 'polizei') return 'Ein Polizist regelt den Verkehr. Wer seine ausgestreckten Arme von vorn oder hinten sieht, muss halten; die Querrichtung ist frei.';
    if (st && st.typ === 'blinken') {
      return 'Die Ampel zeigt gelbes Blinklicht, sie regelt also nichts. ' + (lage.typ === 'rvl'
        ? 'Es gilt rechts vor links.' : 'Es gelten die Schilder.');
    }
    if (lage.typ === 'rvl') return 'Keine Schilder, keine Ampel: rechts vor links.';
    if (lage.typ === 'gerade') return 'Eine Vorfahrtstraße führt geradeaus durch die Kreuzung.';
    return 'Die Vorfahrtstraße knickt ab – das Zusatzzeichen zeigt ihren Verlauf.';
  }

  function fahrzeugText(f) {
    const art = f.art === 'einsatz' ? 'Einsatzfahrzeug ' : f.art === 'tram' ? 'Straßenbahn ' : f.art === 'rad' ? 'Fahrrad ' : '';
    const spur = f.spur === 'radweg' ? ' auf dem Radweg' : '';
    return `${art}kommt von ${ARM_NAME[f.arm]}${spur}, ${WEG_TEXT[f.weg]}`;
  }

  /* ---------- Zeichnung ---------- */
  const M = 200, BR = 46, SPUR = 23, RADSPUR = 60;
  const D = [[0, -1], [-1, 0], [0, 1], [1, 0]];               // Fahrtrichtung in die Kreuzung
  const rechtsVon = v => [-v[1], v[0]];
  const add = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s];
  const fmt = p => `${Math.round(p[0] * 10) / 10} ${Math.round(p[1] * 10) / 10}`;
  const xy = p => `x1="${Math.round(p[0] * 10) / 10}" y1="${Math.round(p[1] * 10) / 10}"`;
  const ASPHALT = '#4C525A';

  function spurPunkt(arm, abstand, nachAussen, seite = SPUR) {
    const d = D[arm];
    const fahrt = nachAussen ? [-d[0], -d[1]] : d;
    return add(add([M, M], d, -abstand), rechtsVon(fahrt), seite);
  }

  function fahrweg(f) {
    const d = D[f.arm];
    const seite = f.spur === 'radweg' ? RADSPUR : SPUR;
    const start = spurPunkt(f.arm, 70, false, seite);
    const ende = spurPunkt(f.aus, 150, true, seite);
    if (f.weg === 'gerade') return `M${fmt(start)} L${fmt(ende)}`;
    const e1 = f.weg === 'links' ? spurPunkt(f.arm, 12, false) : spurPunkt(f.arm, BR, false);
    const e2 = f.weg === 'links' ? spurPunkt(f.aus, 14, true) : spurPunkt(f.aus, BR, true);
    const ctrl = Math.abs(d[0]) < .5 ? [e1[0], e2[1]] : [e2[0], e1[1]];
    return `M${fmt(start)} L${fmt(e1)} Q${fmt(ctrl)} ${fmt(e2)} L${fmt(ende)}`;
  }

  function strassen(arme) {
    let s = '';
    arme.forEach(a => {
      const d = D[a];
      const x = d[0] === 0 ? M - BR : (d[0] < 0 ? M : 0);
      const y = d[1] === 0 ? M - BR : (d[1] < 0 ? M : 0);
      s += `<rect x="${x}" y="${y}" width="${d[0] === 0 ? BR * 2 : M}" height="${d[1] === 0 ? BR * 2 : M}" fill="${ASPHALT}"/>`;
    });
    s += `<rect x="${M - BR}" y="${M - BR}" width="${BR * 2}" height="${BR * 2}" fill="${ASPHALT}"/>`;
    const R = 18;
    for (let a = 0; a < 4; a++) {
      const b = mod4(a + 1);
      if (!arme.includes(a) || !arme.includes(b)) continue;
      const ecke = add(add([M, M], D[a], -BR), D[b], -BR);
      const p1 = add(ecke, D[a], -R), p2 = add(ecke, D[b], -R);
      s += `<path d="M${fmt(ecke)} L${fmt(p1)} A${R} ${R} 0 0 1 ${fmt(p2)} Z" fill="${ASPHALT}"/>`;
    }
    arme.forEach(a => {
      const d = D[a];
      for (let t = BR + 16; t < M; t += 26) {
        const p = add([M, M], d, -t), q = add([M, M], d, -(t + 13));
        s += `<line ${xy(p)} x2="${fmt(q).split(' ')[0]}" y2="${fmt(q).split(' ')[1]}" stroke="#fff" stroke-width="2.4"/>`;
      }
    });
    return s;
  }

  function radweg(arm) {
    // roter Streifen rechts neben der Fahrbahn, vom Rand bis über die Kreuzung
    const d = D[arm], r = rechtsVon(d);
    const a = add(add([M, M], d, -M), r, RADSPUR), b = add(add([M, M], d, 40), r, RADSPUR);
    return `<line ${xy(a)} x2="${fmt(b).split(' ')[0]}" y2="${fmt(b).split(' ')[1]}" stroke="#8C4A3C" stroke-width="17" opacity=".9"/>` +
      `<line ${xy(a)} x2="${fmt(b).split(' ')[0]}" y2="${fmt(b).split(' ')[1]}" stroke="#fff" stroke-width="17" stroke-dasharray="1 13" opacity=".35"/>`;
  }

  function schienen(arm, aus) {
    const punkte = [spurPunkt(arm, M, false), spurPunkt(arm, 0, false)];
    const ende = spurPunkt(aus, M, true);
    let d = `M${fmt(punkte[0])} L${fmt(punkte[1])} L${fmt(ende)}`;
    return `<path d="${d}" fill="none" stroke="#8B8F94" stroke-width="15" opacity=".55"/>` +
      `<path d="${d}" fill="none" stroke="${ASPHALT}" stroke-width="9" opacity=".9"/>`;
  }

  function haltmarke(arm, art) {
    const d = D[arm], r = rechtsVon(d);
    const a = add(add([M, M], d, -(BR + 4)), r, 2), b = add(add([M, M], d, -(BR + 4)), r, BR - 3);
    return `<line ${xy(a)} x2="${b[0]}" y2="${b[1]}" stroke="#fff" stroke-width="${art === '205' ? 3.5 : 5}" ${art === '205' ? 'stroke-dasharray="6 4"' : ''}/>`;
  }

  function schilderAn(lage) {
    let s = '';
    if (lage.typ === 'rvl' || (lage.steuerung && lage.steuerung.frei)) return s;
    lage.arme.forEach(arm => {
      const id = lage.haupt.includes(arm) ? '306' : lage.warte;
      const knick = lage.typ === 'knick'
        ? Zeichen.knick(lage.arme.map(a => mod4(a - arm)), lage.haupt.map(a => mod4(a - arm)))
        : null;
      const w = 30, teil = Zeichen.teil(id);
      const vb = teil.vb.split(' ').map(Number);
      const hSchild = w * vb[3] / vb[2], hKnick = knick ? 25 : 0, hPfosten = 12;
      const hoehe = hSchild + hKnick + hPfosten;
      const aussen = add([-D[arm][0], -D[arm][1]], [-D[mod4(arm + 1)][0], -D[mod4(arm + 1)][1]]);
      const ecke = add([M, M], aussen, BR);
      const abstand = lage.fahrzeuge.some(f => f.spur === 'radweg' && (f.arm === arm || f.arm === mod4(arm + 1))) ? 32 : 8;
      const x = aussen[0] > 0 ? ecke[0] + abstand : ecke[0] - abstand - w;
      const y = aussen[1] > 0 ? ecke[1] + abstand : ecke[1] - abstand - hoehe;
      const px = x + w / 2, fuss = y + hoehe;
      const titel = id === '306' ? 'Vorfahrtstraße' : id === '205' ? 'Vorfahrt gewähren' : 'Halt. Vorfahrt gewähren';
      s += `<g><title>${titel}${knick ? ', mit abknickender Vorfahrt' : ''}</title>`;
      s += `<line x1="${px}" y1="${y + hSchild}" x2="${px}" y2="${fuss}" stroke="#6B7178" stroke-width="2.5"/>`;
      s += `<circle cx="${px}" cy="${fuss}" r="2.6" fill="#6B7178"/>`;
      s += Zeichen.eingebettet(teil, x, y, w);
      if (knick) s += Zeichen.eingebettet(knick, x + 1, y + hSchild + 1, w - 2);
      s += '</g>';
    });
    return s;
  }

  /* Ampeln an jeder Zufahrt, gelbes Blinklicht oder Polizist in der Mitte */
  function steuerungZeichnen(lage) {
    const st = lage.steuerung;
    if (!st) return '';
    let s = '';
    if (st.typ === 'polizei') {
      const quer = st.frei.map(mod4).includes(1);           // Arme zeigen nach links und rechts
      const a1 = quer ? [-26, 0] : [0, -26], a2 = quer ? [26, 0] : [0, 26];
      s += `<g><title>Polizist regelt den Verkehr</title>`;
      s += `<line x1="${M + a1[0]}" y1="${M + a1[1]}" x2="${M + a2[0]}" y2="${M + a2[1]}" stroke="#20395E" stroke-width="7" stroke-linecap="round"/>`;
      s += `<circle cx="${M}" cy="${M}" r="13" fill="#2E4A73" stroke="#fff" stroke-width="3"/>`;
      s += `<circle cx="${M}" cy="${M}" r="6" fill="#F4F4F4"/></g>`;
      return s;
    }
    lage.arme.forEach(arm => {
      const gruen = st.typ === 'ampel' && st.frei.map(mod4).includes(arm);
      const d = D[arm], r = rechtsVon(d);
      const p = add(add([M, M], d, -(BR + 10)), r, BR + 14);
      const farbe = st.typ === 'blinken' ? '#F7B500' : gruen ? '#19A652' : '#E3262B';
      const oben = st.typ === 'blinken' ? '' : gruen ? 'unten' : 'oben';
      s += `<g${st.typ === 'blinken' ? ' class="blinker"' : ''}><title>${st.typ === 'blinken' ? 'Gelbes Blinklicht' : gruen ? 'Grün' : 'Rot'}</title>`;
      s += `<rect x="${p[0] - 8}" y="${p[1] - 20}" width="16" height="40" rx="5" fill="#20262C"/>`;
      [0, 1, 2].forEach(i => {
        const cy = p[1] - 12 + i * 12;
        const an = st.typ === 'blinken' ? i === 1 : (oben === 'oben' ? i === 0 : i === 2);
        s += `<circle cx="${p[0]}" cy="${cy}" r="4.4" fill="${an ? farbe : '#39404799'}"/>`;
      });
      s += '</g>';
    });
    return s;
  }

  function fahrzeugKoerper(f) {
    const c = f.farbe.hex;
    if (f.art === 'rad') {
      return `<rect x="-7" y="-13" width="14" height="26" rx="6" fill="${c}" stroke="rgba(0,0,0,.45)" stroke-width="1.2"/>` +
        `<circle cx="0" cy="-8" r="3.4" fill="rgba(10,20,30,.55)"/><circle cx="0" cy="8" r="3.4" fill="rgba(10,20,30,.55)"/>`;
    }
    if (f.art === 'tram') {
      return `<rect x="-14" y="-38" width="28" height="76" rx="7" fill="${c}" stroke="rgba(0,0,0,.45)" stroke-width="1.5"/>` +
        `<path d="M-10 -30 H10 L9 -22 H-9 Z" fill="rgba(10,20,30,.55)"/>` +
        `<rect x="-12" y="-14" width="24" height="5" rx="2" fill="rgba(255,255,255,.5)"/>` +
        `<rect x="-12" y="4" width="24" height="5" rx="2" fill="rgba(255,255,255,.5)"/>` +
        `<path d="M-10 26 H10 L11 32 Q0 35 -11 32 Z" fill="rgba(10,20,30,.45)"/>`;
    }
    let s = `<rect x="-15" y="-26" width="30" height="52" rx="9" fill="${c}" stroke="rgba(0,0,0,.45)" stroke-width="1.5"/>` +
      `<path d="M-11 -14 Q0 -19 11 -14 L10 -6 H-10 Z" fill="rgba(10,20,30,.55)"/>` +
      `<path d="M-10 13 H10 L11 19 Q0 22 -11 19 Z" fill="rgba(10,20,30,.45)"/>`;
    if (f.art === 'einsatz') {
      s += `<rect x="-13" y="-4" width="26" height="7" rx="3" fill="#20262C"/>` +
        `<circle class="blinker" cx="-7" cy="-.5" r="4" fill="#2B6BE0"/><circle class="blinker" cx="7" cy="-.5" r="4" fill="#2B6BE0"/>`;
    }
    return s;
  }

  function auto(f, idx, gewaehlt) {
    const seite = f.spur === 'radweg' ? RADSPUR : SPUR;
    const p = spurPunkt(f.arm, f.art === 'tram' ? 100 : 92, false, seite);
    const winkel = [0, -90, 180, 90][f.arm];
    const blink = f.weg === 'gerade' || f.art === 'rad' ? '' :
      `<rect class="blinker" x="${f.weg === 'links' ? -16 : 11}" y="-26" width="5" height="7" rx="1.5" fill="#FFB000"/>` +
      `<rect class="blinker" x="${f.weg === 'links' ? -16 : 11}" y="19" width="5" height="7" rx="1.5" fill="#FFB000"/>`;
    const nr = gewaehlt >= 0
      ? `<g transform="rotate(${-winkel})"><circle r="11" cx="0" cy="0" fill="#111" stroke="#fff" stroke-width="2.5"/><text y="4.6" font-size="13" font-weight="700" text-anchor="middle" fill="#fff" font-family="'Barlow Semi Condensed',Arial,sans-serif">${gewaehlt + 1}</text></g>`
      : `<g transform="rotate(${-winkel})"><text y="5" font-size="14" font-weight="700" text-anchor="middle" fill="#fff" font-family="'Barlow Semi Condensed',Arial,sans-serif" stroke="rgba(0,0,0,.35)" stroke-width="2.4" paint-order="stroke">${f.farbe.kurz}</text></g>`;
    return `<g class="fahrzeug${gewaehlt >= 0 ? ' ist-gewaehlt' : ''}" data-idx="${idx}" tabindex="0" role="button" aria-pressed="${gewaehlt >= 0}"
      aria-label="${f.farbe.name}, ${fahrzeugText(f)}${gewaehlt >= 0 ? ', gewählt als ' + (gewaehlt + 1) + '.' : ''}"
      transform="translate(${fmt(p)}) rotate(${winkel})">
      <rect x="-24" y="-40" width="48" height="80" rx="12" fill="transparent"/>
      <rect class="fokusrahmen" x="-21" y="-${f.art === 'tram' ? 42 : 33}" width="42" height="${f.art === 'tram' ? 84 : 66}" rx="11" fill="none" stroke="#F5C400" stroke-width="3.5"/>
      ${fahrzeugKoerper(f)}${blink}${nr}
    </g>`;
  }

  function zeichne(lage, reihenfolge, zeigeLoesung) {
    let s = `<svg class="kreuzung" viewBox="0 0 400 400" role="group" aria-label="Kreuzung von oben">`;
    s += `<rect width="400" height="400" style="fill:var(--umgebung)"/>`;
    s += strassen(lage.arme);
    lage.fahrzeuge.forEach(f => { if (f.spur === 'radweg') s += radweg(f.arm); });
    lage.fahrzeuge.forEach(f => { if (f.art === 'tram') s += schienen(f.arm, f.aus); });
    if (lage.typ !== 'rvl' && !(lage.steuerung && lage.steuerung.frei)) {
      lage.arme.forEach(a => { if (!lage.haupt.includes(a)) s += haltmarke(a, lage.warte); });
    }
    s += `<defs>${lage.fahrzeuge.map((f, i) => `<marker id="spitze${i}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="${f.farbe.hex}"/></marker>`).join('')}</defs>`;
    lage.fahrzeuge.forEach((f, i) => {
      s += `<path d="${fahrweg(f)}" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>`;
      s += `<path d="${fahrweg(f)}" fill="none" stroke="${f.farbe.hex}" stroke-width="4" stroke-dasharray="${zeigeLoesung ? 'none' : '9 6'}" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#spitze${i})"/>`;
    });
    s += schilderAn(lage);
    s += steuerungZeichnen(lage);
    lage.fahrzeuge.forEach((f, i) => { s += auto(f, i, reihenfolge.indexOf(f)); });
    s += `</svg>`;
    return s;
  }

  global.Vorfahrt = { neueLage, pruefe, begruendung, lageText, zeichne, fahrzeugText, WEG_TEXT, ARM_NAME, ART_TEXT };
})(window);
