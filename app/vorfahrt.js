/* Schilderwald – Vorfahrt-Trainer.
   Arme einer Kreuzung: 0 Süd (unten), 1 Ost (rechts), 2 Nord (oben), 3 West (links).
   Vom Arm i aus liegt Arm i+1 rechts, i+2 gegenüber, i+3 links. */
(function (global) {
  'use strict';

  const ARM_NAME = ['unten', 'rechts', 'oben', 'links'];
  const WEG = { rechts: 1, gerade: 2, links: 3 };
  const WEG_TEXT = { rechts: 'biegt rechts ab', gerade: 'fährt geradeaus', links: 'biegt links ab' };
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

  /* Fahrwege als Sehnen auf einem Kreis um die Kreuzung (Rechtsverkehr) */
  const armWinkel = i => norm(270 + 90 * i);
  const einfahrt = f => armWinkel(f.arm) + 10;
  const ausfahrt = f => armWinkel(f.aus) - 10;
  const zwischen = (x, a, b) => { const d = norm(x - a); return d > 0 && d < norm(b - a); };
  function konflikt(A, B) {
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

  /* Wer hat Vorrang? Liefert { sieger, verlierer, grund } oder null */
  function vorrang(A, B, lage) {
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
    const rel = mod4(B.arm - A.arm);
    if (rel === 2) {
      if (A.weg === 'links' && B.weg !== 'links') return { sieger: B, verlierer: A, grund: 'gegen' };
      if (B.weg === 'links' && A.weg !== 'links') return { sieger: A, verlierer: B, grund: 'gegen' };
      return null;
    }
    if (rel === 1) return { sieger: B, verlierer: A, grund: 'rechts' };
    return { sieger: A, verlierer: B, grund: 'rechts' };
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

  function neueLage(modus) {
    for (let versuch = 0; versuch < 400; versuch++) {
      const typ = modus === 'gemischt' ? pick(['rvl', 'gerade', 'knick', 'knick']) : modus;
      const t = Math.random() < (typ === 'knick' ? .25 : .3);
      const fehlt = t ? rnd(4) : -1;
      const arme = [0, 1, 2, 3].filter(a => a !== fehlt);
      let haupt = null;
      if (typ === 'gerade') {
        const opts = arme.filter(a => arme.includes(mod4(a + 2)) && a < 2);
        if (!opts.length) continue;
        const a = pick(opts); haupt = [a, a + 2];
      } else if (typ === 'knick') {
        const opts = arme.filter(a => arme.includes(mod4(a + 1)));
        if (!opts.length) continue;
        const a = pick(opts); haupt = [a, mod4(a + 1)];
      }
      const warte = pick(['205', '206']);
      const anzahl = Math.min(arme.length, pick([2, 3, 3, 4]));
      const farben = shuffle(FARBEN);
      const fahrzeuge = shuffle(arme).slice(0, anzahl).map((arm, i) => {
        const wege = Object.keys(WEG).filter(w => arme.includes(mod4(arm + WEG[w])));
        const weg = pick(wege);
        return { arm, weg, aus: mod4(arm + WEG[weg]), farbe: farben[i] };
      });
      const lage = { typ, arme, haupt, warte, fahrzeuge };
      if (haupt && !fahrzeuge.some(x => haupt.includes(x.arm))) continue;
      if (haupt && fahrzeuge.every(x => haupt.includes(x.arm)) && Math.random() < .6) continue;
      const a = analysiere(lage);
      if (a.blockiert || !a.kanten.length) continue;
      if (a.stufen.length < 2) continue;
      lage.analyse = a;
      return lage;
    }
    return null;
  }

  /* Eine Antwort (Reihenfolge der Fahrzeuge) ist richtig, wenn sie keiner Vorrangbeziehung widerspricht */
  function pruefe(lage, reihenfolge) {
    const pos = new Map(reihenfolge.map((f, i) => [f, i]));
    const fehler = lage.analyse.kanten.filter(k => pos.get(k.sieger) > pos.get(k.verlierer));
    return { richtig: fehler.length === 0 && reihenfolge.length === lage.fahrzeuge.length, fehler };
  }

  function begruendung(k, lage) {
    const s = k.sieger.farbe.name, v = k.verlierer.farbe.name;
    switch (k.grund) {
      case 'schild':
        return `${v} kommt aus der untergeordneten Straße (Zeichen ${lage.warte}) und lässt ${s} auf der Vorfahrtstraße zuerst fahren.`;
      case 'rechts':
        return `${s} kommt für ${v} von rechts – rechts vor links (§ 8 Abs. 1).`;
      case 'gegen':
        return `${v} biegt links ab und lässt den Gegenverkehr ${s} durch (§ 9 Abs. 3 und 4).`;
      case 'knick':
        return `${v} verlässt den Verlauf der abknickenden Vorfahrtstraße nach links und lässt ${s} als Gegenverkehr auf der Vorfahrtstraße durch (§ 9).`;
      default: return '';
    }
  }

  function lageText(lage) {
    if (lage.typ === 'rvl') return 'Keine Schilder, keine Ampel: rechts vor links.';
    if (lage.typ === 'gerade') return 'Eine Vorfahrtstraße führt geradeaus durch die Kreuzung.';
    return 'Die Vorfahrtstraße knickt ab – das Zusatzzeichen zeigt ihren Verlauf.';
  }

  /* ---------- Zeichnung ---------- */
  const M = 200, BR = 46, SPUR = 23;
  const D = [[0, -1], [-1, 0], [0, 1], [1, 0]];               // Fahrtrichtung in die Kreuzung
  const rechtsVon = v => [-v[1], v[0]];
  const add = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s];
  const fmt = p => `${Math.round(p[0] * 10) / 10} ${Math.round(p[1] * 10) / 10}`;
  const ASPHALT = '#4C525A', RAND = '#D9DDE1';

  function spurPunkt(arm, abstand, nachAussen) {
    // Punkt auf dem Fahrstreifen eines Arms; nachAussen = Fahrtrichtung weg von der Kreuzung
    const d = D[arm];
    const fahrt = nachAussen ? [-d[0], -d[1]] : d;
    return add(add([M, M], d, -abstand), rechtsVon(fahrt), SPUR);
  }

  function fahrweg(f) {
    const d = D[f.arm];
    const start = spurPunkt(f.arm, 70, false);
    const ende = spurPunkt(f.aus, 150, true);
    if (f.weg === 'gerade') return `M${fmt(start)} L${fmt(ende)}`;
    const e1 = f.weg === 'links' ? spurPunkt(f.arm, 12, false) : spurPunkt(f.arm, BR, false);
    const e2 = f.weg === 'links' ? spurPunkt(f.aus, 14, true) : spurPunkt(f.aus, BR, true);
    // Kontrollpunkt: Schnitt der beiden Spurgeraden
    const ctrl = Math.abs(d[0]) < .5 ? [e1[0], e2[1]] : [e2[0], e1[1]];
    return `M${fmt(start)} L${fmt(e1)} Q${fmt(ctrl)} ${fmt(e2)} L${fmt(ende)}`;
  }

  function strassen(arme) {
    let s = '';
    arme.forEach(a => {
      const d = D[a];
      const x = d[0] === 0 ? M - BR : (d[0] < 0 ? M : 0);
      const y = d[1] === 0 ? M - BR : (d[1] < 0 ? M : 0);
      const w = d[0] === 0 ? BR * 2 : M;
      const h = d[1] === 0 ? BR * 2 : M;
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${ASPHALT}"/>`;
    });
    s += `<rect x="${M - BR}" y="${M - BR}" width="${BR * 2}" height="${BR * 2}" fill="${ASPHALT}"/>`;
    // Eckausrundungen zwischen benachbarten Armen
    const R = 18;
    for (let a = 0; a < 4; a++) {
      const b = mod4(a + 1);
      if (!arme.includes(a) || !arme.includes(b)) continue;
      const ecke = add(add([M, M], D[a], -BR), D[b], -BR);
      const p1 = add(ecke, D[a], -R), p2 = add(ecke, D[b], -R);
      s += `<path d="M${fmt(ecke)} L${fmt(p1)} A${R} ${R} 0 0 1 ${fmt(p2)} Z" fill="${ASPHALT}"/>`;
    }
    // Mittellinien
    arme.forEach(a => {
      const d = D[a];
      for (let t = BR + 16; t < M; t += 26) {
        const p = add([M, M], d, -t), q = add([M, M], d, -(t + 13));
        s += `<line x1="${fmt(p).split(' ')[0]}" y1="${fmt(p).split(' ')[1]}" x2="${fmt(q).split(' ')[0]}" y2="${fmt(q).split(' ')[1]}" stroke="#fff" stroke-width="2.4"/>`;
      }
    });
    return s;
  }

  function haltmarke(arm, art) {
    // Haltlinie (206) oder Wartelinie (205) quer über den eigenen Fahrstreifen
    const d = D[arm], r = rechtsVon(d);
    const a = add(add([M, M], d, -(BR + 4)), r, 2), b = add(add([M, M], d, -(BR + 4)), r, BR - 3);
    const dash = art === '205' ? 'stroke-dasharray="6 4"' : '';
    return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#fff" stroke-width="${art === '205' ? 3.5 : 5}" ${dash}/>`;
  }

  function schilderAn(lage) {
    let s = '';
    if (lage.typ === 'rvl') return s;
    lage.arme.forEach(arm => {
      const id = lage.haupt.includes(arm) ? '306' : lage.warte;
      const knick = lage.typ === 'knick'
        ? Zeichen.knick(lage.arme.map(a => mod4(a - arm)), lage.haupt.map(a => mod4(a - arm)))
        : null;
      const w = 30, teil = Zeichen.teil(id);
      const vb = teil.vb.split(' ').map(Number);
      const hSchild = w * vb[3] / vb[2], hKnick = knick ? 25 : 0, hPfosten = 12;
      const hoehe = hSchild + hKnick + hPfosten;
      // Ecke rechts neben der Zufahrt, zwischen Arm und rechtem Nachbararm – ganz außerhalb der Fahrbahn
      const aussen = add([-D[arm][0], -D[arm][1]], [-D[mod4(arm + 1)][0], -D[mod4(arm + 1)][1]]);
      const ecke = add([M, M], aussen, BR);
      const x = aussen[0] > 0 ? ecke[0] + 8 : ecke[0] - 8 - w;
      const y = aussen[1] > 0 ? ecke[1] + 8 : ecke[1] - 8 - hoehe;
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

  function auto(f, idx, gewaehlt) {
    const d = D[f.arm];
    const p = spurPunkt(f.arm, 92, false);
    const winkel = [0, -90, 180, 90][f.arm];
    const blink = f.weg === 'gerade' ? '' :
      `<rect class="blinker" x="${f.weg === 'links' ? -16 : 11}" y="-26" width="5" height="7" rx="1.5" fill="#FFB000"/>` +
      `<rect class="blinker" x="${f.weg === 'links' ? -16 : 11}" y="19" width="5" height="7" rx="1.5" fill="#FFB000"/>`;
    const nr = gewaehlt >= 0
      ? `<g transform="rotate(${-winkel})"><circle r="11" cx="0" cy="0" fill="#111" stroke="#fff" stroke-width="2.5"/><text y="4.6" font-size="13" font-weight="700" text-anchor="middle" fill="#fff" font-family="'Barlow Semi Condensed',Arial,sans-serif">${gewaehlt + 1}</text></g>`
      : `<g transform="rotate(${-winkel})"><text y="5" font-size="14" font-weight="700" text-anchor="middle" fill="#fff" font-family="'Barlow Semi Condensed',Arial,sans-serif" stroke="rgba(0,0,0,.35)" stroke-width="2.4" paint-order="stroke">${f.farbe.kurz}</text></g>`;
    void d;
    return `<g class="fahrzeug${gewaehlt >= 0 ? ' ist-gewaehlt' : ''}" data-idx="${idx}" tabindex="0" role="button" aria-pressed="${gewaehlt >= 0}"
      aria-label="${f.farbe.name}, kommt von ${ARM_NAME[f.arm]}, ${WEG_TEXT[f.weg]}${gewaehlt >= 0 ? ', gewählt als ' + (gewaehlt + 1) + '.' : ''}"
      transform="translate(${fmt(p)}) rotate(${winkel})">
      <rect x="-24" y="-36" width="48" height="72" rx="12" fill="transparent"/>
      <rect class="fokusrahmen" x="-21" y="-33" width="42" height="66" rx="11" fill="none" stroke="#F5C400" stroke-width="3.5"/>
      <rect x="-15" y="-26" width="30" height="52" rx="9" fill="${f.farbe.hex}" stroke="rgba(0,0,0,.45)" stroke-width="1.5"/>
      <path d="M-11 -14 Q0 -19 11 -14 L10 -6 H-10 Z" fill="rgba(10,20,30,.55)"/>
      <path d="M-10 13 H10 L11 19 Q0 22 -11 19 Z" fill="rgba(10,20,30,.45)"/>
      ${blink}${nr}
    </g>`;
  }

  function zeichne(lage, reihenfolge, zeigeLoesung) {
    let s = `<svg class="kreuzung" viewBox="0 0 400 400" role="group" aria-label="Kreuzung von oben">`;
    s += `<rect width="400" height="400" style="fill:var(--umgebung)"/>`;
    s += strassen(lage.arme);
    if (lage.typ !== 'rvl') lage.arme.forEach(a => { if (!lage.haupt.includes(a)) s += haltmarke(a, lage.warte); });
    s += `<defs>${lage.fahrzeuge.map((f, i) => `<marker id="spitze${i}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="${f.farbe.hex}"/></marker>`).join('')}</defs>`;
    lage.fahrzeuge.forEach((f, i) => {
      s += `<path d="${fahrweg(f)}" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>`;
      s += `<path d="${fahrweg(f)}" fill="none" stroke="${f.farbe.hex}" stroke-width="4" stroke-dasharray="${zeigeLoesung ? 'none' : '9 6'}" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#spitze${i})"/>`;
    });
    s += schilderAn(lage);
    lage.fahrzeuge.forEach((f, i) => { s += auto(f, i, reihenfolge.indexOf(f)); });
    s += `</svg>`;
    return s;
  }

  global.Vorfahrt = { neueLage, pruefe, begruendung, lageText, zeichne, WEG_TEXT, ARM_NAME };
})(window);
