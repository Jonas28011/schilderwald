# Schilderwald

Läuft unter https://jonas28011.github.io/schilderwald/ (nicht beworben, für Suchmaschinen gesperrt).

Führerschein-Theorie auffrischen – ohne Prüfungsfragen auswendig zu lernen:

- **Verkehrszeichen:** 256 Zeichen mit Bedeutung und Fundstelle, Tests nach Bereichen (10, 20 oder 30 Fragen), freies Üben mit Wiederholung, Nachschlagen
- **Vorfahrt:** immer neue Kreuzungen (rechts vor links, Vorfahrtstraße, abknickende Vorfahrt), ausgewertet nach § 8 und § 9 StVO
- **Faustformeln:** Reaktionsweg, Bremsweg, Anhalteweg, Abstand – mit Rechner und Aufgaben
- **Zahlen & Regeln:** 77 Fakten mit Paragraf

Die Seite läuft ohne Server und ohne Pakete. Lokal ansehen:

```
npx --yes http-server app -p 8080
```

oder jeden anderen statischen Server auf `app/` richten. Nach jeder Änderung an `app/`: `node werkzeuge/web-bauen.mjs` laufen lassen und `app/sw.js` mit einchecken, sonst schlägt der Veröffentlichungs-Workflow fehl. Auf dem Handy lässt sie sich über „Zum Home-Bildschirm“ installieren und läuft danach offline.

## Quellen

- Regeln und Zahlen: eigene Zusammenfassungen der StVO (Stand 30.01.2026), des StVG, der FeV und der StVZO nach gesetze-im-internet.de.
- Bilder der Verkehrszeichen: Wikimedia Commons, dort als gemeinfrei gekennzeichnet (amtliche Werke).
- Ampeln, Polizeizeichen, Kreuzungen und App-Symbol: eigene Zeichnungen.

Keine Rechtsberatung und keine amtliche Prüfungsvorbereitung.
