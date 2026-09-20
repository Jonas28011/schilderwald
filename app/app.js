/* Schilderwald – Oberfläche, Abfragen und Lernstand */
(function () {
  'use strict';
  const { GRUPPEN, SCHILDER, THEMEN, FAKTEN, VORFAHRT_REGELN, RANGFOLGE } = window.Inhalte;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const z = (n, st = 2) => Number(n).toLocaleString('de-DE', { maximumFractionDigits: st });
  const rnd = n => Math.floor(Math.random() * n);
  const pick = a => a[rnd(a.length)];
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = rnd(i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const jetzt = () => Date.now();
  const MIN = 60000, TAG = 86400000;

  /* ================= Lernstand ================= */
  const SPEICHER = 'schilderwald.v1';
  const ABSTAND = [1 * MIN, 10 * MIN, 1 * TAG, 3 * TAG, 7 * TAG, 16 * TAG];
  const leer = () => ({ karten: {}, statistik: { vorfahrt: { r: 0, f: 0 }, formeln: { r: 0, f: 0 } }, geaendert: 0 });
  let stand = leer();
  let syncStand = 'lokal';
  const sk = id => id.replace(/\./g, '_');
  const karte = id => stand.karten[sk(id)] || null;

  function bewerte(id, richtig) {
    const alt = karte(id), t = jetzt();
    let b, d;
    if (!alt) { b = richtig ? 3 : 0; d = t + ABSTAND[b]; }
    else if (richtig && alt.d > t) { b = alt.b; d = alt.d; }          // zu früh wiederholt: Stufe bleibt
    else { b = richtig ? Math.min(5, alt.b + 1) : 0; d = t + ABSTAND[b]; }
    stand.karten[sk(id)] = { b, d, r: (alt ? alt.r : 0) + (richtig ? 1 : 0), f: (alt ? alt.f : 0) + (richtig ? 0 : 1), t };
    geaendert();
  }
  function zaehle(bereich, richtig) { stand.statistik[bereich][richtig ? 'r' : 'f']++; geaendert(); }
  function status(id) { const k = karte(id); return !k ? 'neu' : k.b >= 3 ? 'sicher' : 'arbeit'; }
  const STATUS_TEXT = { neu: 'noch nicht abgefragt', arbeit: 'in Arbeit', sicher: 'sicher' };
  function zaehler(liste) {
    const t = jetzt(), out = { sicher: 0, arbeit: 0, neu: 0, faellig: 0, gesamt: liste.length };
    liste.forEach(x => { const s = status(x.id); out[s]++; const k = karte(x.id); if (k && k.d <= t) out.faellig++; });
    return out;
  }

  function zusammenfuehren(a, b) {
    const out = leer();
    const ka = (a && a.karten) || {}, kb = (b && b.karten) || {};
    new Set([...Object.keys(ka), ...Object.keys(kb)]).forEach(k => {
      const x = ka[k], y = kb[k];
      out.karten[k] = !x ? y : !y ? x : (y.t > x.t ? y : x);
    });
    ['vorfahrt', 'formeln'].forEach(n => ['r', 'f'].forEach(f => {
      out.statistik[n][f] = Math.max((a && a.statistik && a.statistik[n] && a.statistik[n][f]) || 0,
        (b && b.statistik && b.statistik[n] && b.statistik[n][f]) || 0);
    }));
    out.geaendert = Math.max((a && a.geaendert) || 0, (b && b.geaendert) || 0);
    return out;
  }
  function lokalSpeichern() { try { localStorage.setItem(SPEICHER, JSON.stringify(stand)); } catch (e) { /* ohne Speicher weiter */ } }
  function laden() {
    try { const s = localStorage.getItem(SPEICHER); if (s) stand = zusammenfuehren(leer(), JSON.parse(s)); } catch (e) { stand = leer(); }
  }

  let dbDoc = null, schreibt = false, nochmal = false, timer = null;
  function geaendert() {
    stand.geaendert = jetzt();
    lokalSpeichern();
    if (dbDoc) { clearTimeout(timer); timer = setTimeout(schreiben, 1200); }
  }
  async function schreiben() {
    if (!dbDoc) return;
    if (schreibt) { nochmal = true; return; }
    schreibt = true;
    try {
      await dbDoc.set(JSON.parse(JSON.stringify(stand)));
    } catch (e) {
      const c = e && e.code;
      if (c === 'unavailable') { setTimeout(schreiben, 3000 + rnd(2000)); }
      else if (c === 'revoked' || c === 'not_granted' || c === 'capability_disabled' || c === 'capability_removed') { dbDoc = null; setzeSync('lokal'); }
    }
    schreibt = false;
    if (nochmal) { nochmal = false; schreiben(); }
  }
  async function verbinden() {
    try {
      if (!window.claude || typeof window.claude.use !== 'function') return;
      const db = await window.claude.use('db');
      if (!db) return;
      const ref = db.doc('lernstand/haupt');
      const snap = await ref.get();
      const fern = snap.exists ? snap.data() : null;
      stand = zusammenfuehren(stand, fern);
      lokalSpeichern();
      dbDoc = ref;
      setzeSync('sync');
      if (!fern || JSON.stringify(zusammenfuehren(leer(), fern)) !== JSON.stringify(stand)) schreiben();
      if (ansicht === 'start') renderStart();
      if (ansicht === 'schilder' && sch.modus === 'liste') renderSchilderListe();
    } catch (e) { /* bleibt lokal */ }
  }
  function setzeSync(s) {
    syncStand = s;
    $$('.sync').forEach(el => { el.dataset.stand = s; el.querySelector('span').textContent = syncText(); });
  }
  const syncText = () => syncStand === 'sync'
    ? 'Dein Lernstand wird mit diesem Artefakt gespeichert – auf jedem Gerät derselbe.'
    : 'Dein Lernstand wird in diesem Browser gespeichert.';

  /* ================= Navigation ================= */
  let ansicht = 'start';
  const RENDER = {};
  function zeige(ziel, scroll = true) {
    if (!RENDER[ziel]) ziel = 'start';
    ansicht = ziel;
    $$('.ansicht').forEach(s => { s.hidden = s.id !== 'v-' + ziel; });
    $$('[data-ziel]').forEach(b => { if (b.dataset.ziel === ziel) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    RENDER[ziel]();
    try { localStorage.setItem('schilderwald.ansicht', ziel); } catch (e) { /* egal */ }
    if (scroll) window.scrollTo({ top: 0 });
  }
  document.addEventListener('click', e => {
    const n = e.target.closest('[data-ziel]');
    if (n) { e.preventDefault(); zeige(n.dataset.ziel); }
  });

  const nrText = s => !s.nr ? (s.id.startsWith('l-polizei') ? 'Zeichen der Polizei' : s.gruppe === 'licht' ? 'Lichtzeichen' : 'Zusatzzeichen')
    : s.gruppe === 'zusatz' ? `Zusatzzeichen ${s.nr}` : `Zeichen ${s.nr}`;
  const BILDMASSE = window.BILDMASSE || {};
  function seitenverhaeltnis(id) {
    const m = BILDMASSE[id];
    if (m) return m[0] / m[1];
    const vb = Zeichen.hat(id) ? Zeichen.teil(id).vb.split(' ').map(Number) : [0, 0, 1, 1];
    return vb[2] / vb[3];
  }
  const zeichenKlasse = id => { const r = seitenverhaeltnis(id); return 'zeichen' + (r > 1.4 ? ' breit' : '') + (r < .62 ? ' hoch' : ''); };
  /* Amtliche Zeichen als Bild, eigene Zeichnungen (Ampeln, Polizei) als SVG */
  function bild(id, cls = 'zeichen', alt = '', sofort = false) {
    const m = BILDMASSE[id];
    if (m) return `<img class="${cls}" src="z/${encodeURIComponent(id)}.png" width="${m[0]}" height="${m[1]}" alt="${esc(alt)}" decoding="async"${sofort ? '' : ' loading="lazy"'}>`;
    return Zeichen.hat(id) ? Zeichen.svg(id, cls, alt) : '';
  }

  function balken(teile) {
    const summe = teile.reduce((a, t) => a + t.wert, 0) || 1;
    return `<div class="balken" role="img" aria-label="${teile.map(t => `${t.label}: ${t.wert}`).join(', ')}">` +
      teile.filter(t => t.wert > 0).map(t => `<span class="${t.cls}" style="width:${(t.wert / summe * 100).toFixed(2)}%"></span>`).join('') + '</div>';
  }

  /* ================= Start ================= */
  const WALD = [['206', 46], ['274', 78], ['102', 30], ['306', 60], ['215', 40], ['283', 86], ['205', 22]];
  function renderStart() {
    const s = zaehler(SCHILDER), f = zaehler(FAKTEN);
    const vf = stand.statistik.vorfahrt, fo = stand.statistik.formeln;
    const tipp = FAKTEN[Math.floor(jetzt() / TAG) % FAKTEN.length];
    const tippAntwort = tipp.typ === 'zahl' ? `${z(tipp.antwort)} ${tipp.einheit}` : tipp.optionen[tipp.richtig];
    const bereich = (ziel, symbol, titel, text, zahlen, teile, legende) => `
      <article class="karte bereich">
        <div class="symbol" aria-hidden="true">${symbol}</div>
        <h3>${titel}</h3>
        <p class="leise">${text}</p>
        <div style="display:grid;gap:8px">
          <div class="zahlen">${zahlen}</div>
          ${balken(teile)}
          ${legende}
          <button type="button" class="knopf" data-ziel="${ziel}" style="margin-top:6px">${titel} üben</button>
        </div>
      </article>`;
    const leg3 = `<div class="legende"><span><i style="background:var(--gut)"></i>sicher</span><span><i style="background:var(--gelb)"></i>in Arbeit</span><span><i style="background:var(--flaeche-3)"></i>neu</span></div>`;
    const leg2 = `<div class="legende"><span><i style="background:var(--gut)"></i>richtig</span><span><i style="background:var(--schlecht)"></i>falsch</span></div>`;
    $('#v-start').innerHTML = `
      <div class="wald" aria-hidden="true">${WALD.map(([id, h]) => `<div class="baum">${bild(id, 'zeichen-wald', '', true)}<i style="height:${h}px"></i></div>`).join('')}</div>
      <div class="held">
        <h1 id="t-start">Wissen auffrischen statt Fragen auswendig lernen</h1>
        <p>Verkehrszeichen, Vorfahrt, Faustformeln und die Zahlen, die man kennen muss – zusammengefasst aus dem Text der StVO (Stand: Änderung vom 30.01.2026).</p>
      </div>
      <div class="bereiche">
        ${bereich('schilder', bild('306', 'zeichen-symbol', '', true), 'Schilder', `${SCHILDER.length} Zeichen, Markierungen und Zusatzzeichen – erkennen und benennen.`,
          `<b>${s.sicher}</b> von ${s.gesamt} sicher · ${s.faellig} fällig`,
          [{ cls: 'b-sicher', wert: s.sicher, label: 'sicher' }, { cls: 'b-arbeit', wert: s.arbeit, label: 'in Arbeit' }, { cls: 'b-neu', wert: s.neu, label: 'neu' }], leg3)}
        ${bereich('vorfahrt', bild('102', 'zeichen-symbol', '', true), 'Vorfahrt', 'Immer neue Kreuzungen: rechts vor links, Vorfahrtstraße, abknickende Vorfahrt.',
          `<b>${vf.r}</b> von ${vf.r + vf.f} Kreuzungen richtig`,
          [{ cls: 'b-sicher', wert: vf.r, label: 'richtig' }, { cls: 'b-falsch', wert: vf.f, label: 'falsch' }], leg2)}
        ${bereich('formeln', bild('274', 'zeichen-symbol', '', true), 'Formeln', 'Reaktionsweg, Bremsweg, Anhalteweg und Abstand – erklärt und zum Nachrechnen.',
          `<b>${fo.r}</b> von ${fo.r + fo.f} Aufgaben richtig`,
          [{ cls: 'b-sicher', wert: fo.r, label: 'richtig' }, { cls: 'b-falsch', wert: fo.f, label: 'falsch' }], leg2)}
        ${bereich('zahlen', bild('1004-30', 'zeichen-symbol', '', true), 'Zahlen & Regeln', `${FAKTEN.length} Fakten: Tempolimits, Parkabstände, Promille, Kindersitz und mehr.`,
          `<b>${f.sicher}</b> von ${f.gesamt} sicher · ${f.faellig} fällig`,
          [{ cls: 'b-sicher', wert: f.sicher, label: 'sicher' }, { cls: 'b-arbeit', wert: f.arbeit, label: 'in Arbeit' }, { cls: 'b-neu', wert: f.neu, label: 'neu' }], leg3)}
      </div>
      <div class="karte tipp">
        <div class="gross">${esc(tipp.typ === 'zahl' ? `${z(tipp.antwort)} ${tipp.einheit}` : '§')}</div>
        <div style="display:grid;gap:6px">
          <div class="eyebrow">Zahl des Tages</div>
          <p><b>${esc(tipp.frage)}</b> ${tipp.typ === 'wahl' ? esc(tippAntwort) + '.' : ''}</p>
          <p class="leise">${esc(tipp.erklaerung)}</p>
          <p class="quelle">${esc(tipp.quelle)}</p>
        </div>
      </div>
      <p class="sync" data-stand="${syncStand}"><i></i><span>${syncText()}</span></p>
      <p class="quelle">Bilder der Verkehrszeichen: Wikimedia Commons, dort als gemeinfrei gekennzeichnet (amtliche Werke). Ampeln, Polizeizeichen und Kreuzungen: eigene Zeichnungen. Texte: eigene Zusammenfassungen der StVO. Keine Rechtsberatung und keine amtliche Prüfungsvorbereitung.</p>`;
  }
  RENDER.start = renderStart;

  /* ================= Schilder ================= */
  // Zeichen, deren Bild die Antwort schon als Text zeigt: nur zum Nachschlagen
  const OHNE_ABFRAGE = new Set(['1001-30', '1001-32', '1004-30', '1004-32', '1005-30', '1007-30', '1007-32', '1007-35',
    '1007-50', '1007-61', '1008-30', '1008-32', '1012-30', '1012-31', '1012-32', '1012-50', '1020-30', '1020-31', '1020-32',
    '1022-10', '1022-11', '1024-10', '1026-30', '1026-32', '1026-35', '1040-30', '1040-32', '1042-30', '1042-36', '1044-30',
    '1049-11', '1053-30', '1053-31', '1053-32', '1053-33', '1053-34', '1060-33', '333', '390', '454', '457.1']);
  // Zeichen mit Aufschrift, bei denen nur die Bedeutung abgefragt wird
  const NUR_BEDEUTUNG = new Set(['220', '229', '230', '354', '356', '1053-35', '1060-31']);
  const abfragbar = s => !OHNE_ABFRAGE.has(s.id);
  const sch = { modus: 'test', filter: 'alle', frage: null, nummer: 0, sitzung: { r: 0, f: 0 } };
  const schPool = () => SCHILDER.filter(s => abfragbar(s) && (sch.filter === 'alle' || s.gruppe === sch.filter));

  function naechste(liste, letzteId) {
    const t = jetzt();
    const kand = liste.length > 1 ? liste.filter(x => x.id !== letzteId) : liste;
    const due = kand.filter(x => { const k = karte(x.id); return k && k.d <= t; }).sort((a, b) => karte(a.id).d - karte(b.id).d);
    if (due.length) return due[0];
    const neu = kand.filter(x => !karte(x.id));
    if (neu.length) return pick(neu);
    const sortiert = kand.slice().sort((a, b) => (karte(a.id).b - karte(b.id).b) || (karte(a.id).t - karte(b.id).t));
    return pick(sortiert.slice(0, Math.min(5, sortiert.length)));
  }
  function ablenker(richtig) {
    const andere = SCHILDER.filter(s => s.id !== richtig.id && s.name !== richtig.name && s.text !== richtig.text);
    const reihen = [
      shuffle(andere.filter(s => s.form === richtig.form && abfragbar(s))),
      shuffle(andere.filter(s => s.gruppe === richtig.gruppe && abfragbar(s))),
      shuffle(andere)
    ];
    const out = [];
    for (const s of reihen.flat()) { if (out.length === 3) break; if (!out.includes(s) && !out.some(o => o.name === s.name)) out.push(s); }
    return out;
  }
  function frageZu(k) {
    const richtung = NUR_BEDEUTUNG.has(k.id) ? 'bedeutung'
      : k.gruppe === 'markierung' ? 'name'
        : Math.random() < .62 ? 'name' : 'bild';
    return { karte: k, richtung, optionen: shuffle([k, ...ablenker(k)]), antwort: null };
  }
  function neueSchilderFrage() {
    sch.frage = frageZu(naechste(schPool(), sch.frage && sch.frage.karte.id));
    sch.nummer++;
  }

  /* Frage mit Antwortmöglichkeiten; erklaeren = Rückmeldung mit Bedeutung zeigen */
  function frageHtml(q, erklaeren) {
    const k = q.karte, fertig = q.antwort !== null;
    const ergebnis = (o, i) => !fertig ? '' : o === k ? '<span class="marke-ergebnis">Richtig</span>' : i === q.antwort ? '<span class="marke-ergebnis">Deine Wahl</span>' : '';
    const kl = (o, i) => !fertig ? '' : o === k ? ' ist-richtig' : i === q.antwort ? ' ist-falsch' : '';
    const knopf = (o, i, inhalt, extra = '') =>
      `<button type="button" class="option${extra}${kl(o, i)}" data-antwort="${i}" ${fertig ? 'disabled' : ''}><span class="taste">${i + 1}</span>${inhalt}${ergebnis(o, i)}</button>`;
    let kopf, optionen;
    if (q.richtung === 'bild') {
      kopf = `<p class="frage">Welches Bild zeigt „${esc(k.name)}“?</p>`;
      optionen = `<div class="optionen">${q.optionen.map((o, i) => knopf(o, i, bild(o.id, 'zeichen-klein', fertig ? o.name : `Möglichkeit ${i + 1}`, true), ' bild')).join('')}</div>`;
    } else {
      const frage = q.richtung === 'bedeutung' ? 'Was gilt bei diesem Zeichen?'
        : k.gruppe === 'markierung' ? 'Wie heißt diese Markierung?' : 'Was bedeutet dieses Zeichen?';
      kopf = `<p class="frage">${frage}</p><div class="buehne">${bild(k.id, zeichenKlasse(k.id), 'Gesuchtes Zeichen', true)}</div>`;
      const inhalt = o => `<span>${esc(q.richtung === 'bedeutung' ? o.text : o.name)}</span>`;
      optionen = `<div class="optionen text${q.richtung === 'bedeutung' ? ' lang' : ''}">${q.optionen.map((o, i) => knopf(o, i, inhalt(o))).join('')}</div>`;
    }
    let rueck = '';
    if (fertig && erklaeren) {
      const ok = q.optionen[q.antwort] === k, gewaehlt = q.optionen[q.antwort];
      rueck = `
        <div class="rueckmeldung ${ok ? 'gut' : 'schlecht'}" role="status">
          <div class="kopf-r">${bild(k.id, 'zeichen-mini', '', true)}<div><strong>${ok ? 'Richtig' : 'Nicht ganz'} – ${esc(k.name)}</strong><div class="quelle">${nrText(k)} · ${esc(k.quelle)}</div></div></div>
          <p>${esc(k.text)}</p>
          ${!ok ? `<p class="klein leise">Deine Wahl: ${esc(gewaehlt.name)} (${nrText(gewaehlt)}). ${esc(gewaehlt.text)}</p>` : ''}
        </div>`;
    }
    return kopf + optionen + rueck;
  }

  function renderSchilder() {
    const el = $('#v-schilder');
    const chips = [{ id: 'alle', name: 'Alle' }, ...GRUPPEN.map(g => ({ id: g.id, name: g.name }))];
    const text = {
      test: 'Bereich wählen und los: Nach jeder Antwort geht es direkt weiter, am Ende siehst du dein Ergebnis mit allen Fehlern.',
      abfrage: 'Freies Üben ohne Ende, mit Erklärung nach jeder Antwort. Was du sicher weißt, kommt seltener dran; Fehler kommen bald wieder.',
      liste: 'Alle Zeichen zum Nachschlagen – antippen für die Bedeutung.'
    }[sch.modus];
    el.innerHTML = `
      <div class="kopfzeile">
        <div><h2 id="t-schilder">Verkehrszeichen</h2><p>${text}</p></div>
        <div class="umschalter" role="group" aria-label="Ansicht">
          <button type="button" data-schmodus="test" aria-pressed="${sch.modus === 'test'}">Test</button>
          <button type="button" data-schmodus="abfrage" aria-pressed="${sch.modus === 'abfrage'}">Üben</button>
          <button type="button" data-schmodus="liste" aria-pressed="${sch.modus === 'liste'}">Alle Zeichen</button>
        </div>
      </div>
      ${sch.modus === 'test' ? '' : `<div class="chips" role="group" aria-label="Zeichenart">${chips.map(c => `<button type="button" class="chip" data-schfilter="${c.id}" aria-pressed="${sch.filter === c.id}">${c.name}</button>`).join('')}</div>`}
      <div id="schilder-inhalt"></div>`;
    if (sch.modus === 'test') renderTest();
    else if (sch.modus === 'abfrage') renderSchilderQuiz();
    else renderSchilderListe();
  }
  RENDER.schilder = renderSchilder;

  function renderSchilderQuiz() {
    const box = $('#schilder-inhalt');
    if (!box) return;
    if (!sch.frage || !schPool().includes(sch.frage.karte)) neueSchilderFrage();
    const q = sch.frage, fertig = q.antwort !== null;
    const zl = zaehler(schPool());
    box.innerHTML = `
      <div class="karte quiz">
        <div class="quiz-kopf">
          <span class="eyebrow">Frage ${sch.nummer}</span>
          <span class="fortschritt-zeile"><span><b>${zl.faellig}</b> fällig</span><span><b>${zl.neu}</b> neu</span><span><b>${zl.sicher}</b> von ${zl.gesamt} sicher</span></span>
        </div>
        ${frageHtml(q, true)}
        <div class="knopfzeile">
          ${fertig ? '<button type="button" class="knopf" id="sch-weiter">Nächstes Zeichen</button>' : '<span class="leise klein tastenhinweis">Tasten 1–4 wählen eine Antwort, Enter geht weiter.</span>'}
          <span class="leise klein">Diese Runde: ${sch.sitzung.r} richtig, ${sch.sitzung.f} falsch</span>
        </div>
      </div>`;
  }
  function antwortSchild(i) {
    const q = sch.frage;
    if (!q || q.antwort !== null || !q.optionen[i]) return;
    q.antwort = i;
    const ok = q.optionen[i] === q.karte;
    bewerte(q.karte.id, ok);
    sch.sitzung[ok ? 'r' : 'f']++;
    renderSchilderQuiz();
    const w = $('#sch-weiter'); if (w) w.focus({ preventScroll: true });
  }
  function weiterSchild() { neueSchilderFrage(); renderSchilderQuiz(); }

  /* ----- Test: feste Anzahl Fragen, Ergebnis am Ende ----- */
  const test = { phase: 'wahl', gruppe: 'alle', anzahl: 30, fragen: [], pos: 0, sperre: false, titel: '' };
  const testPool = g => SCHILDER.filter(s => abfragbar(s) && (g === 'alle' || s.gruppe === g));
  const gruppenName = g => g === 'alle' ? 'Alle Zeichen' : (GRUPPEN.find(x => x.id === g) || {}).name;
  function testStarten(karten, titel) {
    // unsichere und neue Zeichen zuerst, sonst zufällig
    const rang = s => (status(s.id) === 'sicher' ? 1 : 0);
    const auswahl = karten || shuffle(testPool(test.gruppe)).sort((a, b) => rang(a) - rang(b)).slice(0, test.anzahl);
    test.fragen = shuffle(auswahl).map(frageZu);
    test.pos = 0; test.sperre = false; test.phase = 'laufend';
    test.titel = titel || gruppenName(test.gruppe);
    renderTest();
  }
  function renderTest() {
    const box = $('#schilder-inhalt');
    if (!box) return;
    if (test.phase === 'wahl') {
      const bereiche = [{ id: 'alle', name: 'Alle Zeichen' }, ...GRUPPEN].map(g => ({ id: g.id, name: g.name, n: testPool(g.id).length })).filter(g => g.n >= 4);
      box.innerHTML = `
        <div class="karte test-wahl">
          <div class="feld"><div class="eyebrow">Bereich</div>
            <div class="chips" role="group" aria-label="Bereich">${bereiche.map(g => `<button type="button" class="chip" data-testgruppe="${g.id}" aria-pressed="${test.gruppe === g.id}">${g.name} <span class="anzahl">${g.n}</span></button>`).join('')}</div></div>
          <div class="feld"><div class="eyebrow">Anzahl Fragen</div>
            <div class="chips" role="group" aria-label="Anzahl">${[10, 20, 30].map(n => `<button type="button" class="chip" data-testanzahl="${n}" aria-pressed="${test.anzahl === n}">${n}</button>`).join('')}</div></div>
          <p class="leise klein">Gemischt aus Zeichen erkennen, Bild zuordnen und Bedeutung wählen. Zeichen, die du noch nicht sicher kannst, kommen zuerst dran.</p>
          <div class="knopfzeile"><button type="button" class="knopf" id="test-start">Test starten – ${Math.min(test.anzahl, testPool(test.gruppe).length)} Fragen</button></div>
        </div>`;
      return;
    }
    const n = test.fragen.length;
    const beantwortet = test.fragen.filter(q => q.antwort !== null);
    const richtig = beantwortet.filter(q => q.optionen[q.antwort] === q.karte).length;
    const falsch = beantwortet.length - richtig;
    if (test.phase === 'laufend') {
      const q = test.fragen[test.pos];
      box.innerHTML = `
        <div class="karte quiz">
          <div class="quiz-kopf">
            <span class="eyebrow">${esc(test.titel)} · Frage ${test.pos + 1} von ${n}</span>
            <span class="fortschritt-zeile"><span><b>${richtig}</b> richtig</span><span><b>${falsch}</b> falsch</span></span>
          </div>
          <div class="testbalken" role="progressbar" aria-label="Fortschritt" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${test.pos}"><span style="width:${(test.pos / n * 100).toFixed(1)}%"></span></div>
          ${frageHtml(q, false)}
          <div class="knopfzeile">
            <button type="button" class="knopf zweit" id="test-abbrechen">Test abbrechen</button>
            <span class="leise klein tastenhinweis">Tasten 1–4 wählen eine Antwort.</span>
          </div>
        </div>`;
      return;
    }
    // Ergebnis
    const quote = Math.round(richtig / n * 100);
    const urteil = richtig === n ? 'Alles richtig!' : quote >= 90 ? 'Sehr gut.' : quote >= 70 ? 'Gut – ein paar Lücken.' : 'Da lohnt sich Wiederholen.';
    const fehler = test.fragen.filter(q => q.optionen[q.antwort] !== q.karte);
    box.innerHTML = `
      <div class="karte ergebnis" role="status">
        <div class="ergebnis-kopf">
          <div class="ergebnis-zahl">${richtig}<small>/${n}</small></div>
          <div><h3>${urteil}</h3><p class="leise">${quote} % richtig · ${esc(test.titel)}</p></div>
        </div>
        ${balken([{ cls: 'b-sicher', wert: richtig, label: 'richtig' }, { cls: 'b-falsch', wert: fehler.length, label: 'falsch' }])}
        <div class="knopfzeile">
          ${fehler.length ? `<button type="button" class="knopf" id="test-fehler">Fehler üben (${fehler.length})</button>` : ''}
          <button type="button" class="knopf${fehler.length ? ' zweit' : ''}" id="test-neu">Neuer Test</button>
          <button type="button" class="knopf zweit" id="test-wahl">Anderer Bereich</button>
        </div>
      </div>
      ${fehler.length ? `
        <section class="karte fehler-karte">
          <h3>Deine Fehler</h3>
          <ul class="fehlerliste">${fehler.map(q => {
            const k = q.karte, g = q.optionen[q.antwort];
            const deine = q.richtung === 'bild' ? `das Bild von „${esc(g.name)}“` : q.richtung === 'bedeutung' ? `„${esc(g.text)}“` : `„${esc(g.name)}“`;
            return `<li>
              <button type="button" class="fehlerbild" data-detail="${k.id}" aria-label="${esc(k.name)} ansehen">${bild(k.id, 'zeichen-mini', '', true)}</button>
              <div><b>${esc(k.name)}</b> <span class="quelle">${nrText(k)}</span>
                <p>${esc(k.text)}</p>
                <p class="klein leise">Deine Antwort: ${deine}</p></div>
            </li>`;
          }).join('')}</ul>
        </section>` : ''}`;
  }
  function testAntwort(i) {
    if (test.phase !== 'laufend' || test.sperre) return;
    const q = test.fragen[test.pos];
    if (!q || q.antwort !== null || !q.optionen[i]) return;
    q.antwort = i;
    const ok = q.optionen[i] === q.karte;
    bewerte(q.karte.id, ok);
    test.sperre = true;
    renderTest();
    setTimeout(() => {
      test.sperre = false;
      test.pos++;
      if (test.pos >= test.fragen.length) test.phase = 'ende';
      if (ansicht === 'schilder' && sch.modus === 'test') { renderTest(); if (test.phase === 'ende') window.scrollTo({ top: 0 }); }
    }, ok ? 650 : 1600);
  }

  function renderSchilderListe() {
    const box = $('#schilder-inhalt');
    if (!box) return;
    const gruppen = GRUPPEN.filter(g => sch.filter === 'alle' || g.id === sch.filter);
    box.innerHTML = gruppen.map(g => `
      <section class="gruppe">
        <div><h3>${g.name}</h3><p class="leise klein">${esc(g.info)}</p></div>
        <div class="gitter">${SCHILDER.filter(s => s.gruppe === g.id).map(s => `
          <button type="button" class="kachel" data-detail="${s.id}">
            ${bild(s.id, 'zeichen-kachel')}
            <span class="nr"><i class="punkt ${status(s.id)}" title="${STATUS_TEXT[status(s.id)]}"></i>${nrText(s)}</span>
            <span class="name">${esc(s.name)}</span>
          </button>`).join('')}</div>
      </section>`).join('') +
      `<div class="legende"><span><i style="background:var(--gut);border-radius:50%"></i>sicher</span><span><i style="background:var(--gelb);border-radius:50%"></i>in Arbeit</span><span><i style="background:var(--flaeche-3);border-radius:50%"></i>noch nicht abgefragt</span></div>`;
  }
  function zeigeDetail(id) {
    const s = SCHILDER.find(x => x.id === id);
    if (!s) return;
    const k = karte(id);
    $('#detail-innen').innerHTML = `
      ${bild(id, zeichenKlasse(id), s.name, true)}
      <div><div class="quelle">${nrText(s)} · ${esc(s.quelle)}</div><h3 id="detail-titel">${esc(s.name)}</h3></div>
      <p>${esc(s.text)}</p>
      <p class="klein leise">${!abfragbar(s) ? 'Wird nicht abgefragt – die Aufschrift sagt schon alles.' : k ? `${k.r}× richtig, ${k.f}× falsch – ${STATUS_TEXT[status(id)]}` : 'Noch nicht abgefragt.'}</p>
      <button type="button" class="knopf zweit schliessen" data-schliessen>Schließen</button>`;
    const d = $('#detail');
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  }
  $('#detail').addEventListener('click', e => {
    if (e.target.id === 'detail' || e.target.closest('[data-schliessen]')) $('#detail').close();
  });

  $('#v-schilder').addEventListener('click', e => {
    const t = e.target;
    const m = t.closest('[data-schmodus]'); if (m) { sch.modus = m.dataset.schmodus; renderSchilder(); return; }
    const f = t.closest('[data-schfilter]'); if (f) { sch.filter = f.dataset.schfilter; if (sch.frage && !schPool().includes(sch.frage.karte)) sch.frage = null; renderSchilder(); return; }
    const tg = t.closest('[data-testgruppe]'); if (tg) { test.gruppe = tg.dataset.testgruppe; renderTest(); return; }
    const ta = t.closest('[data-testanzahl]'); if (ta) { test.anzahl = +ta.dataset.testanzahl; renderTest(); return; }
    if (t.closest('#test-start') || t.closest('#test-neu')) { testStarten(); return; }
    if (t.closest('#test-fehler')) { testStarten(test.fragen.filter(q => q.optionen[q.antwort] !== q.karte).map(q => q.karte), 'Fehler üben'); return; }
    if (t.closest('#test-wahl') || t.closest('#test-abbrechen')) { test.phase = 'wahl'; renderTest(); return; }
    const a = t.closest('[data-antwort]');
    if (a) { if (sch.modus === 'test') testAntwort(+a.dataset.antwort); else antwortSchild(+a.dataset.antwort); return; }
    if (t.closest('#sch-weiter')) { weiterSchild(); return; }
    const d = t.closest('[data-detail]'); if (d) zeigeDetail(d.dataset.detail);
  });

  /* ================= Vorfahrt ================= */
  const vf = { modus: 'ueben', art: 'gemischt', lage: null, reihe: [], geprueft: false, nummer: 0, sitzung: { r: 0, f: 0 } };
  const VF_ARTEN = [
    { id: 'gemischt', name: 'Gemischt' }, { id: 'rvl', name: 'Rechts vor links' },
    { id: 'gerade', name: 'Vorfahrtstraße' }, { id: 'knick', name: 'Abknickende Vorfahrt' }
  ];
  const REGEL_ZEICHEN = [['102'], ['306', '301', '205', '206'], [], ['306', '1002-10'], ['215', '205'], ['325.2'], ['208', '308'], ['201', '151']];

  function neueVfLage() {
    vf.lage = Vorfahrt.neueLage(vf.art);
    vf.reihe = []; vf.geprueft = false; vf.nummer++;
  }
  function renderVorfahrt() {
    const el = $('#v-vorfahrt');
    el.innerHTML = `
      <div class="kopfzeile">
        <div><h2 id="t-vorfahrt">Vorfahrt</h2>
        <p>Jede Kreuzung wird neu zusammengesetzt und nach § 8 und § 9 StVO ausgewertet – du lernst die Regeln, nicht die Bilder.</p></div>
        <div class="umschalter" role="group" aria-label="Ansicht">
          <button type="button" data-vfmodus="ueben" aria-pressed="${vf.modus === 'ueben'}">Üben</button>
          <button type="button" data-vfmodus="regeln" aria-pressed="${vf.modus === 'regeln'}">Regeln</button>
        </div>
      </div>
      ${vf.modus === 'ueben' ? `
        <div class="chips" role="group" aria-label="Art der Kreuzung">${VF_ARTEN.map(a => `<button type="button" class="chip" data-vfart="${a.id}" aria-pressed="${vf.art === a.id}">${a.name}</button>`).join('')}</div>
        <div id="vf-inhalt"></div>` : regelnHtml()}`;
    if (vf.modus === 'ueben') renderVfUebung();
  }
  RENDER.vorfahrt = renderVorfahrt;

  function regelnHtml() {
    return `
      <div class="karte" style="display:grid;gap:14px">
        <h3 style="font-size:26px">Was gilt zuerst?</h3>
        <ol class="rangfolge">${RANGFOLGE.map(r => `<li><b>${r.titel}</b><span class="leise klein">${esc(r.text)}</span><span class="quelle">${r.quelle}</span></li>`).join('')}</ol>
      </div>
      <div class="regeln">${VORFAHRT_REGELN.map((r, i) => `
        <article class="karte regel">
          ${REGEL_ZEICHEN[i] && REGEL_ZEICHEN[i].length ? `<div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap">${REGEL_ZEICHEN[i].map(id => bild(id, 'zeichen-regel')).join('')}</div>` : ''}
          <h3>${r.titel}</h3>
          <p>${esc(r.text)}</p>
          <p class="quelle">${esc(r.quelle)}</p>
        </article>`).join('')}</div>`;
  }

  function renderVfUebung() {
    const box = $('#vf-inhalt');
    if (!box) return;
    if (!vf.lage) neueVfLage();
    const L = vf.lage;
    if (!L) { box.innerHTML = '<p class="leer">Keine passende Kreuzung gefunden. Bitte eine andere Art wählen.</p>'; return; }
    const erg = vf.geprueft ? Vorfahrt.pruefe(L, vf.reihe) : null;
    const alle = vf.reihe.length === L.fahrzeuge.length;
    const pille = (f, i) => `<span class="pille"><i style="background:${f.farbe.hex}">${i + 1}</i>${f.farbe.name}</span>`;
    box.innerHTML = `
      <div class="vorfahrt-layout">
        <div class="kreuzung-rahmen">${Vorfahrt.zeichne(L, vf.reihe, vf.geprueft)}</div>
        <div class="karte quiz">
          <div class="quiz-kopf">
            <span class="eyebrow">Kreuzung ${vf.nummer}</span>
            <span class="fortschritt-zeile"><span>Diese Runde: <b>${vf.sitzung.r}</b> richtig, <b>${vf.sitzung.f}</b> falsch</span></span>
          </div>
          <p class="frage">In welcher Reihenfolge fahren die Fahrzeuge?</p>
          <p class="leise">${Vorfahrt.lageText(L)} Tippe die Fahrzeuge der Reihe nach an. Wer gleichzeitig fahren darf, kannst du in beliebiger Folge wählen.</p>
          <ul class="fzliste">${L.fahrzeuge.map((f, i) => `<li><span class="farbe" style="background:${f.farbe.hex}"></span><button type="button" class="chip" data-vfwahl="${i}" ${vf.geprueft ? 'disabled' : ''} aria-pressed="${vf.reihe.includes(f)}"><b>${f.farbe.name}</b></button><span class="leise">kommt von ${Vorfahrt.ARM_NAME[f.arm]}, ${Vorfahrt.WEG_TEXT[f.weg]}</span></li>`).join('')}</ul>
          <div style="display:grid;gap:6px">
            <div class="eyebrow">Deine Reihenfolge</div>
            <div class="reihe">${vf.reihe.length ? vf.reihe.map(pille).join('') : '<span class="leise klein">Noch nichts gewählt</span>'}</div>
          </div>
          ${erg ? `
            <div class="rueckmeldung ${erg.richtig ? 'gut' : 'schlecht'}" role="status">
              <strong>${erg.richtig ? 'Richtig.' : 'Nicht ganz. So ist es richtig:'}</strong>
              <ol class="stufen">${L.analyse.stufen.map(st => `<li><span>${st.map(f => `<b>${f.farbe.name}</b>`).join(' und ')}${st.length > 1 ? ' – gleichzeitig, sie kommen sich nicht in die Quere' : ''}</span></li>`).join('')}</ol>
              <ul class="gruende">${L.analyse.kanten.map(k => `<li${erg.fehler.includes(k) ? ' style="font-weight:700"' : ''}>${esc(Vorfahrt.begruendung(k, L))}</li>`).join('')}</ul>
              ${L.fahrzeuge.some(a => a.weg === 'links' && L.fahrzeuge.some(b => b !== a && b.weg === 'links' && (b.arm - a.arm + 4) % 4 === 2))
                ? '<p class="klein">Zwei Linksabbieger aus entgegengesetzten Richtungen biegen voreinander ab (§ 9 Abs. 4).</p>' : ''}
            </div>` : ''}
          <div class="knopfzeile">
            ${vf.geprueft
              ? '<button type="button" class="knopf" id="vf-neu">Nächste Kreuzung</button>'
              : `<button type="button" class="knopf" id="vf-pruefen" ${alle ? '' : 'disabled'}>Prüfen</button>
                 <button type="button" class="knopf zweit" id="vf-zurueck" ${vf.reihe.length ? '' : 'disabled'}>Zurücksetzen</button>`}
          </div>
        </div>
      </div>`;
  }
  function vfWaehle(i) {
    if (vf.geprueft || !vf.lage) return;
    const f = vf.lage.fahrzeuge[i];
    if (!f) return;
    const pos = vf.reihe.indexOf(f);
    if (pos >= 0) vf.reihe.splice(pos, 1); else vf.reihe.push(f);
    renderVfUebung();
    if (vf.reihe.length === vf.lage.fahrzeuge.length) { const p = $('#vf-pruefen'); if (p) p.focus({ preventScroll: true }); }
    else { const g = $(`.fahrzeug[data-idx="${i}"]`); if (g && document.activeElement === document.body) g.focus({ preventScroll: true }); }
  }
  function vfPruefen() {
    if (!vf.lage || vf.reihe.length !== vf.lage.fahrzeuge.length) return;
    vf.geprueft = true;
    const ok = Vorfahrt.pruefe(vf.lage, vf.reihe).richtig;
    vf.sitzung[ok ? 'r' : 'f']++;
    zaehle('vorfahrt', ok);
    renderVfUebung();
    const n = $('#vf-neu'); if (n) n.focus({ preventScroll: true });
  }
  $('#v-vorfahrt').addEventListener('click', e => {
    const t = e.target;
    const m = t.closest('[data-vfmodus]'); if (m) { vf.modus = m.dataset.vfmodus; renderVorfahrt(); return; }
    const a = t.closest('[data-vfart]'); if (a) { vf.art = a.dataset.vfart; neueVfLage(); renderVorfahrt(); return; }
    const w = t.closest('[data-vfwahl]'); if (w) { vfWaehle(+w.dataset.vfwahl); return; }
    const g = t.closest('.fahrzeug'); if (g) { vfWaehle(+g.dataset.idx); return; }
    if (t.closest('#vf-pruefen')) { vfPruefen(); return; }
    if (t.closest('#vf-zurueck')) { vf.reihe = []; renderVfUebung(); return; }
    if (t.closest('#vf-neu')) { neueVfLage(); renderVfUebung(); }
  });
  $('#v-vorfahrt').addEventListener('keydown', e => {
    const g = e.target.closest && e.target.closest('.fahrzeug');
    if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); vfWaehle(+g.dataset.idx); }
  });

  /* ================= Formeln ================= */
  const fo = { modus: 'erklaerung', tempo: 50, art: 'alle', aufgabe: null, eingabe: '', geprueft: false, nummer: 0, sitzung: { r: 0, f: 0 } };
  const f10 = v => v / 10;
  const RW = v => f10(v) * 3, BW = v => f10(v) * f10(v), GW = v => BW(v) / 2, AW = v => RW(v) + BW(v), AG = v => RW(v) + GW(v);
  const TEMPI = [30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130];
  const AUFGABEN = {
    reaktion: () => { const v = pick(TEMPI); return { frage: `Du fährst ${v} km/h. Wie lang ist der Reaktionsweg?`, loesung: RW(v), einheit: 'm', weg: `(${v} ÷ 10) × 3 = ${z(f10(v))} × 3 = ${z(RW(v))} m` }; },
    bremsweg: () => { const v = pick(TEMPI); return { frage: `Du fährst ${v} km/h und bremst normal. Wie lang ist der Bremsweg?`, loesung: BW(v), einheit: 'm', weg: `(${v} ÷ 10) × (${v} ÷ 10) = ${z(f10(v))} × ${z(f10(v))} = ${z(BW(v))} m` }; },
    gefahr: () => { const v = pick(TEMPI); return { frage: `Gefahrbremsung aus ${v} km/h: Wie lang ist der Bremsweg?`, loesung: GW(v), einheit: 'm', weg: `(${z(f10(v))} × ${z(f10(v))}) ÷ 2 = ${z(BW(v))} ÷ 2 = ${z(GW(v))} m` }; },
    anhalte: () => { const v = pick(TEMPI); return { frage: `Du fährst ${v} km/h. Wie lang ist der Anhalteweg bei normaler Bremsung?`, loesung: AW(v), einheit: 'm', weg: `Reaktionsweg ${z(RW(v))} m + Bremsweg ${z(BW(v))} m = ${z(AW(v))} m` }; },
    anhalteGefahr: () => { const v = pick(TEMPI); return { frage: `Du fährst ${v} km/h. Wie lang ist der Anhalteweg bei einer Gefahrbremsung?`, loesung: AG(v), einheit: 'm', weg: `Reaktionsweg ${z(RW(v))} m + Bremsweg ${z(GW(v))} m (${z(BW(v))} ÷ 2) = ${z(AG(v))} m` }; },
    abstand: () => { const v = pick(TEMPI.slice(3)); return { frage: `Außerorts mit ${v} km/h: Wie viele Meter Abstand hältst du nach „halber Tacho“ mindestens?`, loesung: v / 2, einheit: 'm', weg: `${v} ÷ 2 = ${z(v / 2)} m` }; },
    sekunde: () => { const v = pick([36, 54, 72, 90, 108, 126]); return { frage: `Wie viele Meter fährst du bei ${v} km/h in einer Sekunde?`, loesung: v / 3.6, einheit: 'm', weg: `${v} ÷ 3,6 = ${z(v / 3.6)} m` }; },
    faktor: () => { const [a, b] = pick([[30, 60], [40, 80], [50, 100], [60, 120], [30, 90], [40, 120]]); const k = b / a; return { frage: `Du fährst ${b} statt ${a} km/h. Um das Wievielfache wird der Bremsweg länger?`, loesung: k * k, einheit: 'fach', weg: `${b} ÷ ${a} = ${k}, und ${k} × ${k} = ${k * k}. Der Bremsweg wächst mit dem Quadrat der Geschwindigkeit: ${z(BW(a))} m werden zu ${z(BW(b))} m.` }; },
    differenz: () => { const a = pick(TEMPI.slice(0, 8)), b = a + pick([10, 20]); return { frage: `Wie viele Meter länger ist der Anhalteweg (normale Bremsung) bei ${b} km/h als bei ${a} km/h?`, loesung: AW(b) - AW(a), einheit: 'm', weg: `${b} km/h: ${z(RW(b))} + ${z(BW(b))} = ${z(AW(b))} m. ${a} km/h: ${z(RW(a))} + ${z(BW(a))} = ${z(AW(a))} m. Unterschied: ${z(AW(b) - AW(a))} m.` }; }
  };
  const AUFGABEN_ARTEN = [
    { id: 'alle', name: 'Alle', typen: Object.keys(AUFGABEN) },
    { id: 'reaktion', name: 'Reaktionsweg', typen: ['reaktion'] },
    { id: 'brems', name: 'Bremsweg', typen: ['bremsweg', 'gefahr'] },
    { id: 'anhalte', name: 'Anhalteweg', typen: ['anhalte', 'anhalteGefahr'] },
    { id: 'abstand', name: 'Abstand und Tempo', typen: ['abstand', 'sekunde'] },
    { id: 'vergleich', name: 'Vergleichen', typen: ['faktor', 'differenz'] }
  ];
  function neueAufgabe() {
    const art = AUFGABEN_ARTEN.find(a => a.id === fo.art) || AUFGABEN_ARTEN[0];
    let a, n = 0;
    do { a = AUFGABEN[pick(art.typen)](); n++; } while (fo.aufgabe && a.frage === fo.aufgabe.frage && n < 10);
    fo.aufgabe = a; fo.eingabe = ''; fo.geprueft = false; fo.nummer++;
  }
  function leseZahl(s) {
    let t = String(s).trim().replace(/\s| /g, '');
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '');
    t = t.replace(',', '.');
    if (!/^-?\d*\.?\d+$/.test(t)) return NaN;
    return Number(t);
  }
  const gleich = (a, b) => Math.abs(a - b) < 1e-6 || Math.abs(Math.round(a * 10) / 10 - Math.round(b * 10) / 10) < 1e-9 && Math.abs(a - b) < 0.051;

  const FORMELN = [
    { titel: 'Reaktionsweg', gl: '(Tempo ÷ 10) × 3', bsp: '50 km/h → 5 × 3 = 15 m', text: 'Die Strecke, die du fährst, bevor du bremst. Die Formel rechnet mit etwa einer Sekunde Reaktionszeit.' },
    { titel: 'Bremsweg', gl: '(Tempo ÷ 10) × (Tempo ÷ 10)', bsp: '50 km/h → 5 × 5 = 25 m', text: 'Bei einer normalen Bremsung. Doppeltes Tempo heißt vierfacher Bremsweg.' },
    { titel: 'Gefahrbremsung', gl: 'Bremsweg ÷ 2', bsp: '50 km/h → 25 ÷ 2 = 12,5 m', text: 'Bei einer Vollbremsung ist der Bremsweg etwa halb so lang wie bei einer normalen Bremsung.' },
    { titel: 'Anhalteweg', gl: 'Reaktionsweg + Bremsweg', bsp: '50 km/h → 15 + 25 = 40 m', text: 'Mit Gefahrbremsung: 15 + 12,5 = 27,5 m. Innerhalb der Strecke, die du überblickst, musst du anhalten können (§ 3 Abs. 1).' },
    { titel: 'Sicherheitsabstand', gl: 'Tempo ÷ 2 = Meter', bsp: '100 km/h → 50 m', text: '„Halber Tacho“ für außerorts, das sind knapp zwei Sekunden. Innerorts gelten bei 50 km/h rund 15 m als Faustwert. Rechtlich muss der Abstand reichen, um bei plötzlichem Bremsen des Vordermanns zu halten (§ 4 Abs. 1).' },
    { titel: 'km/h in m/s', gl: 'Tempo ÷ 3,6', bsp: '72 km/h → 20 m pro Sekunde', text: 'So weit kommst du in jeder Sekunde. Bei 50 km/h sind es knapp 14 m.' }
  ];

  function renderFormeln() {
    const el = $('#v-formeln');
    el.innerHTML = `
      <div class="kopfzeile">
        <div><h2 id="t-formeln">Faustformeln</h2>
        <p>In der Prüfung wird mit Faustformeln gerechnet. Sie gelten für trockene Straße und ein Auto in gutem Zustand – bei Nässe, Glätte oder schlechten Reifen wird der Bremsweg länger.</p></div>
        <div class="umschalter" role="group" aria-label="Ansicht">
          <button type="button" data-fomodus="erklaerung" aria-pressed="${fo.modus === 'erklaerung'}">Erklärung</button>
          <button type="button" data-fomodus="rechnen" aria-pressed="${fo.modus === 'rechnen'}">Rechnen</button>
        </div>
      </div>
      ${fo.modus === 'erklaerung' ? erklaerungHtml() : `
        <div class="chips" role="group" aria-label="Aufgabenart">${AUFGABEN_ARTEN.map(a => `<button type="button" class="chip" data-foart="${a.id}" aria-pressed="${fo.art === a.id}">${a.name}</button>`).join('')}</div>
        <div id="fo-inhalt"></div>`}`;
    if (fo.modus === 'erklaerung') zeichneDiagramm(); else renderAufgabe();
  }
  RENDER.formeln = renderFormeln;

  function erklaerungHtml() {
    return `
      <div class="karte rechner">
        <div class="regler">
          <output id="fo-tempo-aus" for="fo-tempo">${fo.tempo}<small> km/h</small></output>
          <div style="display:grid;gap:4px">
            <label for="fo-tempo" class="eyebrow">Geschwindigkeit wählen</label>
            <input type="range" id="fo-tempo" min="10" max="150" step="10" value="${fo.tempo}">
          </div>
        </div>
        <div class="werte" id="fo-werte"></div>
        <div style="display:grid;gap:8px">
          <div class="legende" aria-hidden="true"><span><i style="background:var(--serie-1)"></i>Reaktionsweg</span><span><i style="background:var(--serie-2)"></i>Bremsweg</span></div>
          <div class="diagramm" id="fo-diagramm"><div class="tooltip" id="fo-tooltip"></div></div>
        </div>
      </div>
      <div class="formeln">${FORMELN.map(f => `
        <article class="karte formel">
          <div class="eyebrow">${f.titel}</div>
          <div class="gleichung">${f.gl}</div>
          <div class="beispiel">${f.bsp}</div>
          <p class="leise klein">${f.text}</p>
        </article>`).join('')}</div>
      <div class="karte" style="display:grid;gap:12px">
        <h3 style="font-size:26px">Merksätze</h3>
        <p class="merksatz">Doppeltes Tempo: doppelter Reaktionsweg, aber vierfacher Bremsweg.</p>
        <p class="merksatz">Bei der Gefahrbremsung halbiert sich nur der Bremsweg – der Reaktionsweg bleibt gleich.</p>
        <p class="merksatz">Die Faustformeln rechnen mit trockener Fahrbahn. Wer schlecht sieht, fährt so, dass er innerhalb der übersehbaren Strecke halten kann.</p>
      </div>`;
  }

  function zeichneDiagramm() {
    const v = fo.tempo;
    const aus = $('#fo-tempo-aus'); if (aus) aus.innerHTML = `${v}<small> km/h</small>`;
    const werte = $('#fo-werte');
    if (werte) werte.innerHTML = [
      ['Reaktionsweg', RW(v)], ['Bremsweg normal', BW(v)], ['Anhalteweg normal', AW(v)],
      ['Bremsweg Gefahr', GW(v)], ['Anhalteweg Gefahr', AG(v)], ['Abstand „halber Tacho“', v / 2]
    ].map(([t, w]) => `<div class="wert"><span>${t}</span><b>${z(w, 1)} m</b></div>`).join('');
    const box = $('#fo-diagramm');
    if (!box) return;
    const W = Math.max(300, box.clientWidth || 600);
    const L = W < 440 ? 74 : 110, rechts = 58, MAX = 300;
    const plot = W - L - rechts;
    const x = m => L + m / MAX * plot;
    const zeilen = [
      { name: 'Normal', r: RW(v), b: BW(v) },
      { name: W < 440 ? 'Gefahr' : 'Gefahrbremsung', r: RW(v), b: GW(v) }
    ];
    const H = 150, BH = 22;
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Anhalteweg bei ${v} km/h: normal ${z(AW(v))} m, Gefahrbremsung ${z(AG(v))} m">`;
    for (let m = 0; m <= MAX; m += 50) {
      s += `<line x1="${x(m)}" y1="14" x2="${x(m)}" y2="${H - 26}" style="stroke:var(--gitter)" stroke-width="1"/>`;
      s += `<text x="${x(m)}" y="${H - 8}" text-anchor="middle">${m}${m === MAX ? ' m' : ''}</text>`;
    }
    zeilen.forEach((zl, i) => {
      const y = 30 + i * 48;
      s += `<text x="${L - 10}" y="${y + BH / 2 + 5}" text-anchor="end">${zl.name}</text>`;
      const x0 = x(0), x1 = x(zl.r), x2 = x(zl.r + zl.b);
      const w1 = Math.max(0, x1 - x0 - 1), w2 = Math.max(0, x2 - x1 - 1);
      s += `<rect class="seg" x="${x0}" y="${y}" width="${w1}" height="${BH}" style="fill:var(--serie-1)" data-tip="Reaktionsweg: ${z(zl.r)} m"/>`;
      const bx = x1 + 1, r = Math.min(4, w2 / 2);
      s += `<path class="seg" d="M${bx} ${y} H${bx + w2 - r} Q${bx + w2} ${y} ${bx + w2} ${y + r} V${y + BH - r} Q${bx + w2} ${y + BH} ${bx + w2 - r} ${y + BH} H${bx} Z" style="fill:var(--serie-2)" data-tip="${i ? 'Bremsweg (Gefahr)' : 'Bremsweg'}: ${z(zl.b)} m"/>`;
      s += `<text class="wertlabel" x="${x2 + 8}" y="${y + BH / 2 + 5}">${z(zl.r + zl.b, 1)} m</text>`;
    });
    s += '</svg>';
    const tip = $('#fo-tooltip');
    box.innerHTML = s;
    box.appendChild(tip || Object.assign(document.createElement('div'), { className: 'tooltip', id: 'fo-tooltip' }));
  }
  function zeigeTip(e) {
    const seg = e.target.closest && e.target.closest('.seg');
    const tip = $('#fo-tooltip'), box = $('#fo-diagramm');
    if (!tip || !box) return;
    if (!seg) { tip.classList.remove('an'); return; }
    const r = box.getBoundingClientRect(), sr = seg.getBoundingClientRect();
    tip.textContent = seg.dataset.tip;
    tip.style.left = `${Math.min(r.width - 60, Math.max(60, sr.left + sr.width / 2 - r.left))}px`;
    tip.style.top = `${sr.top - r.top}px`;
    tip.classList.add('an');
  }

  function renderAufgabe() {
    const box = $('#fo-inhalt');
    if (!box) return;
    if (!fo.aufgabe) neueAufgabe();
    const a = fo.aufgabe;
    const wert = leseZahl(fo.eingabe);
    const ok = fo.geprueft && gleich(wert, a.loesung);
    box.innerHTML = `
      <div class="karte quiz" style="max-width:760px">
        <div class="quiz-kopf">
          <span class="eyebrow">Aufgabe ${fo.nummer}</span>
          <span class="fortschritt-zeile"><span>Diese Runde: <b>${fo.sitzung.r}</b> richtig, <b>${fo.sitzung.f}</b> falsch</span></span>
        </div>
        <p class="frage">${esc(a.frage)}</p>
        <form class="eingabe" id="fo-form" autocomplete="off">
          <label for="fo-antwort"><input id="fo-antwort" inputmode="decimal" value="${esc(fo.eingabe)}" ${fo.geprueft ? 'disabled' : ''} aria-describedby="fo-hinweis"><span class="einheit">${a.einheit === 'fach' ? '-fach' : a.einheit}</span></label>
          ${fo.geprueft ? '' : '<button type="submit" class="knopf">Prüfen</button>'}
        </form>
        <p class="leise klein" id="fo-hinweis">Nach Faustformel rechnen. Kommazahlen mit Komma oder Punkt.</p>
        ${fo.geprueft ? `
          <div class="rueckmeldung ${ok ? 'gut' : 'schlecht'}" role="status">
            <strong>${ok ? 'Richtig' : `Nicht ganz – richtig ist ${z(a.loesung)}${a.einheit === 'fach' ? '-fach' : ' ' + a.einheit}`}</strong>
            <p>${esc(a.weg)}</p>
          </div>
          <div class="knopfzeile"><button type="button" class="knopf" id="fo-neu">Nächste Aufgabe</button></div>` : ''}
      </div>`;
    if (!fo.geprueft) { const i = $('#fo-antwort'); if (i && ansicht === 'formeln' && !matchMedia('(hover: none)').matches) i.focus({ preventScroll: true }); }
  }
  function aufgabePruefen() {
    const i = $('#fo-antwort');
    fo.eingabe = i ? i.value : '';
    const wert = leseZahl(fo.eingabe);
    const hinweis = $('#fo-hinweis');
    if (Number.isNaN(wert)) { if (hinweis) hinweis.textContent = 'Bitte eine Zahl eingeben, zum Beispiel 27,5.'; if (i) i.focus(); return; }
    fo.geprueft = true;
    const ok = gleich(wert, fo.aufgabe.loesung);
    fo.sitzung[ok ? 'r' : 'f']++;
    zaehle('formeln', ok);
    renderAufgabe();
    const n = $('#fo-neu'); if (n) n.focus({ preventScroll: true });
  }
  const vfo = $('#v-formeln');
  vfo.addEventListener('click', e => {
    const t = e.target;
    const m = t.closest('[data-fomodus]'); if (m) { fo.modus = m.dataset.fomodus; renderFormeln(); return; }
    const a = t.closest('[data-foart]'); if (a) { fo.art = a.dataset.foart; neueAufgabe(); renderFormeln(); return; }
    if (t.closest('#fo-neu')) { neueAufgabe(); renderAufgabe(); return; }
    zeigeTip(e);
  });
  vfo.addEventListener('submit', e => { if (e.target.id === 'fo-form') { e.preventDefault(); aufgabePruefen(); } });
  vfo.addEventListener('input', e => {
    if (e.target.id === 'fo-tempo') { fo.tempo = +e.target.value; zeichneDiagramm(); }
    if (e.target.id === 'fo-antwort') fo.eingabe = e.target.value;
  });
  vfo.addEventListener('mousemove', zeigeTip);
  vfo.addEventListener('mouseleave', () => { const t = $('#fo-tooltip'); if (t) t.classList.remove('an'); });
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (ansicht === 'formeln' && fo.modus === 'erklaerung') zeichneDiagramm(); }, 120);
  });

  /* ================= Zahlen & Regeln ================= */
  const za = { modus: 'abfrage', thema: 'alle', frage: null, nummer: 0, eingabe: '', sitzung: { r: 0, f: 0 } };
  const zaPool = () => FAKTEN.filter(f => za.thema === 'alle' || f.thema === za.thema);
  function neueFaktFrage() {
    const f = naechste(zaPool(), za.frage && za.frage.fakt.id);
    const reihenfolge = f.typ === 'wahl' ? shuffle(f.optionen.map((_, i) => i)) : null;
    za.frage = { fakt: f, reihenfolge, antwort: null, wert: null };
    za.eingabe = '';
    za.nummer++;
  }
  function renderZahlen() {
    const el = $('#v-zahlen');
    const chips = [{ id: 'alle', name: 'Alle' }, ...THEMEN];
    el.innerHTML = `
      <div class="kopfzeile">
        <div><h2 id="t-zahlen">Zahlen &amp; Regeln</h2>
        <p>Die Werte, die man im Kopf haben muss – mit der Stelle im Gesetz, wo sie stehen.</p></div>
        <div class="umschalter" role="group" aria-label="Ansicht">
          <button type="button" data-zamodus="abfrage" aria-pressed="${za.modus === 'abfrage'}">Abfragen</button>
          <button type="button" data-zamodus="nachlesen" aria-pressed="${za.modus === 'nachlesen'}">Nachlesen</button>
        </div>
      </div>
      <div class="chips" role="group" aria-label="Thema">${chips.map(c => `<button type="button" class="chip" data-zathema="${c.id}" aria-pressed="${za.thema === c.id}">${c.name}</button>`).join('')}</div>
      <div id="za-inhalt"></div>`;
    if (za.modus === 'abfrage') renderFaktQuiz(); else renderFaktListe();
  }
  RENDER.zahlen = renderZahlen;

  function antwortText(f) { return f.typ === 'zahl' ? `${z(f.antwort)} ${f.einheit}` : f.optionen[f.richtig]; }
  function renderFaktQuiz() {
    const box = $('#za-inhalt');
    if (!box) return;
    if (!za.frage || !zaPool().includes(za.frage.fakt)) neueFaktFrage();
    const q = za.frage, f = q.fakt, fertig = q.antwort !== null;
    const zl = zaehler(zaPool());
    const thema = THEMEN.find(t => t.id === f.thema);
    let koerper;
    if (f.typ === 'wahl') {
      koerper = `<div class="optionen text" style="grid-template-columns:1fr">${q.reihenfolge.map((oi, i) => {
        const kl = !fertig ? '' : oi === f.richtig ? ' ist-richtig' : i === q.antwort ? ' ist-falsch' : '';
        const mk = !fertig ? '' : oi === f.richtig ? '<span class="marke-ergebnis">Richtig</span>' : i === q.antwort ? '<span class="marke-ergebnis">Deine Wahl</span>' : '';
        return `<button type="button" class="option${kl}" data-zaantwort="${i}" ${fertig ? 'disabled' : ''}><span class="taste">${i + 1}</span><span>${esc(f.optionen[oi])}</span>${mk}</button>`;
      }).join('')}</div>`;
    } else {
      koerper = `
        <form class="eingabe" id="za-form" autocomplete="off">
          <label for="za-antwort"><input id="za-antwort" inputmode="decimal" value="${esc(za.eingabe)}" ${fertig ? 'disabled' : ''} aria-describedby="za-hinweis"><span class="einheit">${esc(f.einheit)}</span></label>
          ${fertig ? '' : '<button type="submit" class="knopf">Prüfen</button>'}
        </form>
        <p class="leise klein" id="za-hinweis">Nur die Zahl eingeben.</p>`;
    }
    const ok = fertig && q.richtig;
    box.innerHTML = `
      <div class="karte quiz" style="max-width:820px">
        <div class="quiz-kopf">
          <span class="eyebrow">${esc(thema ? thema.name : '')} · Frage ${za.nummer}</span>
          <span class="fortschritt-zeile"><span><b>${zl.faellig}</b> fällig</span><span><b>${zl.neu}</b> neu</span><span><b>${zl.sicher}</b> von ${zl.gesamt} sicher</span></span>
        </div>
        <p class="frage">${esc(f.frage)}</p>
        ${koerper}
        ${fertig ? `
          <div class="rueckmeldung ${ok ? 'gut' : 'schlecht'}" role="status">
            <strong>${ok ? 'Richtig' : 'Nicht ganz'} – ${esc(antwortText(f))}</strong>
            <p>${esc(f.erklaerung)}</p>
            <p class="quelle">${esc(f.quelle)}</p>
          </div>
          <div class="knopfzeile"><button type="button" class="knopf" id="za-weiter">Nächste Frage</button><span class="leise klein">Diese Runde: ${za.sitzung.r} richtig, ${za.sitzung.f} falsch</span></div>` : ''}
      </div>`;
    if (!fertig && f.typ === 'zahl') { const i = $('#za-antwort'); if (i && ansicht === 'zahlen' && !matchMedia('(hover: none)').matches) i.focus({ preventScroll: true }); }
  }
  function faktAntwort(ok, info) {
    const q = za.frage;
    q.antwort = info; q.richtig = ok;
    bewerte(q.fakt.id, ok);
    za.sitzung[ok ? 'r' : 'f']++;
    renderFaktQuiz();
    const w = $('#za-weiter'); if (w) w.focus({ preventScroll: true });
  }
  function renderFaktListe() {
    const box = $('#za-inhalt');
    if (!box) return;
    const themen = THEMEN.filter(t => za.thema === 'alle' || t.id === za.thema);
    box.innerHTML = `<div class="themen">${themen.map(t => `
      <section class="karte" style="display:grid;gap:8px">
        <h3 style="font-size:26px">${t.name}</h3>
        <ul class="faktliste">${FAKTEN.filter(f => f.thema === t.id).map(f => `
          <li>
            <span>${esc(f.frage)}</span>
            <span class="antwort${f.typ === 'wahl' ? ' lang' : ''}">${esc(antwortText(f))}</span>
            <span class="erkl">${esc(f.erklaerung)} <span class="quelle">${esc(f.quelle)}</span></span>
          </li>`).join('')}</ul>
      </section>`).join('')}</div>`;
  }
  const vza = $('#v-zahlen');
  vza.addEventListener('click', e => {
    const t = e.target;
    const m = t.closest('[data-zamodus]'); if (m) { za.modus = m.dataset.zamodus; renderZahlen(); return; }
    const th = t.closest('[data-zathema]'); if (th) { za.thema = th.dataset.zathema; if (za.frage && !zaPool().includes(za.frage.fakt)) za.frage = null; renderZahlen(); return; }
    const a = t.closest('[data-zaantwort]');
    if (a && za.frage && za.frage.antwort === null) { const i = +a.dataset.zaantwort; faktAntwort(za.frage.reihenfolge[i] === za.frage.fakt.richtig, i); return; }
    if (t.closest('#za-weiter')) { neueFaktFrage(); renderFaktQuiz(); }
  });
  vza.addEventListener('submit', e => {
    if (e.target.id !== 'za-form') return;
    e.preventDefault();
    const i = $('#za-antwort');
    za.eingabe = i ? i.value : '';
    const wert = leseZahl(za.eingabe);
    if (Number.isNaN(wert)) { const h = $('#za-hinweis'); if (h) h.textContent = 'Bitte eine Zahl eingeben, zum Beispiel 1,5.'; if (i) i.focus(); return; }
    faktAntwort(gleich(wert, za.frage.fakt.antwort), wert);
  });
  vza.addEventListener('input', e => { if (e.target.id === 'za-antwort') za.eingabe = e.target.value; });

  /* ================= Tastatur ================= */
  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if ($('#detail').open) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    const zahl = /^[1-4]$/.test(e.key) ? +e.key - 1 : -1;
    if (ansicht === 'schilder' && sch.modus === 'test' && test.phase === 'laufend') {
      if (zahl >= 0) { e.preventDefault(); testAntwort(zahl); }
    } else if (ansicht === 'schilder' && sch.modus === 'abfrage' && sch.frage) {
      if (zahl >= 0 && sch.frage.antwort === null) { e.preventDefault(); antwortSchild(zahl); }
      else if (e.key === 'Enter' && sch.frage.antwort !== null && tag !== 'button') { e.preventDefault(); weiterSchild(); }
    } else if (ansicht === 'zahlen' && za.modus === 'abfrage' && za.frage) {
      const q = za.frage;
      if (zahl >= 0 && q.antwort === null && q.fakt.typ === 'wahl' && zahl < q.reihenfolge.length) { e.preventDefault(); faktAntwort(q.reihenfolge[zahl] === q.fakt.richtig, zahl); }
      else if (e.key === 'Enter' && q.antwort !== null && tag !== 'button') { e.preventDefault(); neueFaktFrage(); renderFaktQuiz(); }
    } else if (ansicht === 'formeln' && fo.modus === 'rechnen' && fo.geprueft && e.key === 'Enter' && tag !== 'button') {
      e.preventDefault(); neueAufgabe(); renderAufgabe();
    }
  });

  /* ================= Start ================= */
  laden();
  let erste = 'start';
  try { erste = localStorage.getItem('schilderwald.ansicht') || 'start'; } catch (e) { /* Start */ }
  zeige(erste, false);
  verbinden();
})();
