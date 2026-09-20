# Schilderwald – Projektinstruktionen

Lern-App zum Auffrischen der Führerschein-Theorie (Klasse B): Verkehrszeichen,
Vorfahrt, Faustformeln, Zahlen und Regeln. Kommunikation auf Deutsch.
Persönliche Notizen und Zugänge stehen in `NOTIZEN.local.md` (nicht im
Repository). Dieses Repository ist öffentlich – keine persönlichen Daten,
keine Pfade vom Rechner und keine Zugangsdaten hineinschreiben.

## Inhalte – was erlaubt ist

- Grundlage sind nur Gesetzestexte (StVO, StVG, FeV, StVZO von
  gesetze-im-internet.de) und eigene Zusammenfassungen. `quellen/` enthält
  den StVO-Text vom Stand 30.01.2026.
- **Keine Fragen aus dem amtlichen Fragenkatalog** (lizenzpflichtig,
  TÜV | DEKRA arge tp 21), nichts aus Lehrbüchern oder anderen Apps
  übernehmen. Ziel ist verstandenes Wissen, kein Auswendiglernen von Fragen.
- Zeichenbilder: amtliche Zeichen von Wikimedia Commons (dort gemeinfrei),
  als PNG-Vorschaubilder in 500 px. **Wikimedia sperrt schnelle Abrufe**
  (429, bis zu 10 Minuten, auch die API): nur Standardbreiten
  (120/250/330/500 px) und höchstens eine Datei alle 3 s laden.
  `werkzeuge/thumbs.mjs` und `thumbs-laden.mjs` zeigen den Weg,
  `png-bereinigen.mjs` entfernt Text- und Zeitblöcke. Jedes neue Bild vor
  dem Veröffentlichen ansehen (`werkzeuge/pruefung.html`).
- Ampeln, Polizeizeichen und die Kreuzungen sind eigene Zeichnungen
  (`app/schilder.js`).
- Rechtsfragen nicht raten: im Gesetzestext nachsehen oder nachfragen.

## Aufbau

- `app/` – die Website, genau so veröffentlicht: `index.html`,
  `inhalte.js` (Zeichenkatalog, Fakten, Regeln), `vorfahrt.js`
  (Kreuzungsgenerator nach § 8/§ 9), `schilder.js` (Zeichnungen),
  `bilder.js` (Bildmaße), `app.js` (Oberfläche, Lernstand, Tests),
  `z/` (244 Zeichenbilder), `icons/`, `manifest.webmanifest`, `sw.js`.
- `artefakt/index.html` – dieselbe Seite ohne Dokumentgerüst für die
  Fassung als claude.ai-Artefakt, wird erzeugt.
- `werkzeuge/` – Bau- und Prüfskripte (nur `node`, keine Pakete).
- Teile, die nur auf der Website gelten (Manifest, Service Worker,
  `noindex`), stehen in `index.html` zwischen `<!-- nur-web -->` und
  `<!-- /nur-web -->`.

## Bauen und prüfen

- Nach jeder Änderung an `app/`: `node werkzeuge/web-bauen.mjs` – schreibt
  `app/sw.js` (neue Cache-Version) und `artefakt/index.html`. `app/sw.js`
  mit einchecken, sonst bricht der Veröffentlichungs-Workflow ab.
- Vorfahrt-Regeln: `node werkzeuge/vorfahrt-pruefung.cjs` – alle Fälle
  müssen „OK“ sein. Neue Regeln dort als Fall ergänzen.
- Symbole: `node werkzeuge/icons-bauen.mjs`.
- Ein Artefakt darf höchstens 255 Dateien haben (Seite plus 5 Skripte plus
  Bilder) – deshalb sind es 244 Zeichenbilder.

## Veröffentlichung

- Website: https://jonas28011.github.io/schilderwald/ – seit 20.09.2026 über
  GitHub Pages aus dem Ordner `app/` (Workflow `.github/workflows/pages.yml`).
  Jeder Push auf `main` veröffentlicht neu.
- **Versteckt, nicht beworben:** `noindex` und `robots.txt` sperren
  Suchmaschinen. Vor einem echten öffentlichen Start: Schriften selbst
  ausliefern statt Google Fonts, Impressum und Datenschutzerklärung,
  `noindex` und `robots.txt` entfernen.
- Auf der Website liegt der Lernstand nur im Browser (kein Abgleich
  zwischen Geräten).

## Git

- Commit-Identität: die GitHub-noreply-Adresse verwenden, nie eine private
  Mailadresse (GitHub weist den Push sonst ab).
- **Commits und Pushes nur auf Ansage.** Niemals zurücksetzen.
