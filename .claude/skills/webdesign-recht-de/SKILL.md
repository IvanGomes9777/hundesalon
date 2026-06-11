---
name: webdesign-recht-de
description: Rechtliche Absicherungs-Checkliste für selbständige Webdesigner/Webentwickler in Deutschland (Impressum § 5 DDG, DSGVO/Datenschutzerklärung, Cookie-Banner § 25 TDDDG, Google Fonts, US-Hosting/AVV, AGB für Werkverträge, Anzahlung § 307 BGB, Abnahme § 640 BGB, Widerrufsrecht §§ 312g/355/356/357a BGB, B2B-Beschränkung, Abmahnfallen). Use when reviewing or creating Impressum, Datenschutzerklärung, AGB, Widerrufsbelehrung or a contact form for a German freelance web designer / agency site, or when the user asks how to legally protect such a site. Stand der Recherche: Juni 2026 — kein Ersatz für anwaltliche Beratung.
---

# Webdesign-Recht Deutschland — Absicherungs-Checkliste

Vollständige Referenz mit Paragraphen, Fundstellen und Quellen:
**[docs/rechtliche-absicherung-webdesign-de.md](../../../docs/rechtliche-absicherung-webdesign-de.md)** (im selben Repo). Diese Datei kann in andere Projekte kopiert werden — nach `<projekt>/.claude/skills/webdesign-recht-de/` (projektlokal) oder `~/.claude/skills/webdesign-recht-de/` (global für alle Projekte).

> ⚠️ **Kein Ersatz für anwaltliche Beratung.** Sorgfältig recherchierte Arbeitsgrundlage (Stand Juni 2026). Vor produktivem Einsatz Fachanwalt (IT-/Medienrecht) prüfen lassen. Datumsangaben und „beobachten"-Punkte vor jedem Projekt verifizieren.

## So anwenden
Beim Prüfen/Erstellen rechtlicher Seiten einer deutschen Webdesigner-Website jeden der folgenden Blöcke gegen den Code abgleichen. Besonders auf **Diskrepanzen zwischen Datenschutzerklärung und tatsächlicher Technik** achten (häufigster Fehler).

## Schnell-Checkliste
- [ ] **Impressum § 5 DDG** (nicht TMG): Name, ladungsfähige Anschrift (kein Postfach), E-Mail + Telefon, USt-IdNr nur falls vorhanden, Steuernummer NICHT.
- [ ] **OS-Plattform-Link entfernen** — seit 20.07.2025 abgeschaltet (VO (EU) 2024/3228); toter Link = Abmahnrisiko. **VSBG-Hinweis behalten.**
- [ ] **Datenschutzerklärung Art. 13 DSGVO** vollständig, in ≤ 2 Klicks; **muss den echten Datenfluss abbilden** (jeder Maildienst/Backend/Hoster als Auftragsverarbeiter Art. 28 benannt).
- [ ] **Cookie-Banner nur bei nicht-notwendigen Cookies/Tracking** (§ 25 TDDDG). Ohne Tracking: kein Banner.
- [ ] **Google Fonts lokal** einbinden (LG München I, 3 O 17493/20). Next.js: `next/font/google`.
- [ ] **TLS/SSL** für Formulare (Art. 32 DSGVO); Datensparsamkeit (Art. 5).
- [ ] **US-Dienste (Hosting/Mail/CDN):** AVV (Art. 28) + DPF/SCC (Art. 46). DPF-Status beobachten (EuGH C-703/25 P) → SCC-Fallback.
- [ ] **AGB:** Werkvertrag (§§ 631 ff.); Teil-Anzahlung zulässig, 100 % Vorkasse ggü. Verbrauchern riskant (§ 307); Abnahme § 640 Abs. 2 (Frist + Verbraucher-Hinweis Textform); **Textform statt Schriftform** (§ 309 Nr. 13); Haftung (Kardinalpflichten + ProdHaftG/Garantie unberührt, § 309 Nr. 7); Nutzungsrechte erst nach Zahlung (§ 31 UrhG); Gerichtsstand nur Kaufleute (§ 38 ZPO); § 306 statt Ersetzungsklausel.
- [ ] **Widerrufsbelehrung B2C** (§§ 312g, 355, 356 BGB) + Muster-Widerrufsformular (Art. 246a EGBGB); vorzeitiger Beginn nur auf ausdrückliches Verlangen, Wertersatz § 357a Abs. 2 (NICHT veraltet § 357 Abs. 8). Nur Verbraucher, nicht Unternehmer.
- [ ] **B2B-Beschränkung** (falls gewünscht): Hinweis + aktive Bestätigung der Unternehmereigenschaft + Abfrage objektiver Merkmale — bloße Behauptung reicht nicht („im Zweifel Verbraucher", BGH VIII ZR 7/09).

## Top-Abmahnfallen
Fehlendes/falsches Impressum (§ 5 TMG statt DDG) · toter OS-Link · unvollständige Datenschutzerklärung · dynamische Google Fonts · Formular ohne SSL · Cookies ohne Consent · fehlende Widerrufsbelehrung · Button ohne „zahlungspflichtig bestellen" (§ 312j, Vertrag sonst unwirksam) · Bilder/Fonts ohne Lizenz (UrhG) · Newsletter ohne Einwilligung (§ 7 UWG).

Die vollständige Tabelle mit allen Normen, Urteilen und Quellen steht in der verlinkten MD-Referenz.
