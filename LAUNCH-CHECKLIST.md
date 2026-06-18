# 🐾 Go-Live-Checkliste — Hundesalon Emika

Alle offenen Punkte, die noch erledigt werden müssen, bevor die Seite wirklich
online geht. Abhaken, sobald erledigt.

---

## 1. Konfiguration in Vercel (Environment Variables)

### 📧 E-Mail (Resend) — Bestätigungs- & Benachrichtigungs-Mails
- [ ] `RESEND_API_KEY` — API-Key aus resend.com
- [ ] `FROM_EMAIL` — Absenderadresse (Domain muss bei Resend verifiziert sein, SPF/DKIM)
- [ ] `OWNER_EMAIL` — Postfach des Salons (bekommt die Termin-Benachrichtigungen)

### 📅 Google-Kalender — automatischer Eintrag + Doppelbuchungs-Sperre
- [ ] Google-Cloud-Projekt anlegen und **Google Calendar API** aktivieren
- [ ] **Service-Account** erstellen, JSON-Key herunterladen
- [ ] `GOOGLE_SA_EMAIL` (client_email aus dem JSON)
- [ ] `GOOGLE_SA_PRIVATE_KEY` (private_key aus dem JSON; `\n` dürfen maskiert bleiben)
- [ ] `GOOGLE_CALENDAR_ID` — zum **Testen** erst der eigene Kalender, **später** der Firmenkalender (nur diese Variable umstellen, kein Code-Deploy nötig)
- [ ] Den Kalender mit der Service-Account-Adresse **teilen** → Recht „Änderungen an Terminen vornehmen"
- [ ] optional: `APPT_DURATION_MIN` (Standard 60), `APPT_TIMEZONE` (Standard `Europe/Berlin`)

> Ohne diese Variablen läuft die Seite normal, aber: keine E-Mails, kein
> Kalendereintrag und keine echte Doppelbuchungs-Sperre.

---

## 2. Inhalte & echte Daten
- [ ] Echte Fotos statt Platzhalter einsetzen (Hero, Galerie, Team, Über uns)
- [ ] Team prüfen (Namen / Rollen / Fotos) — und mit der **Mitarbeiterliste im Buchungssystem** abgleichen (aktuell: Katja, Jana, Mira, Tom)
- [ ] Leistungen & Preise prüfen
- [ ] Öffnungszeiten prüfen (aktuell **Mi–Sa 11–17**, Mo/Di/So geschlossen) — bestimmt die buchbaren Uhrzeiten
- [ ] Kontaktdaten prüfen: Telefon, E-Mail, Adresse (aktuell Telefon 0178 8179912, E-Mail Platzhalter `hallo@hundesalon-emika.de`)
- [ ] Bewertungs-Texte / Google-Bewertungen prüfen
- [ ] Ggf. Termindauer je Leistung differenzieren (aktuell pauschal 60 Min)

---

## 3. Rechtliches (Pflicht vor Go-Live!)
Die Platzhalter stehen im Footer unter „Impressum" und „Datenschutz".
- [ ] **Impressum** füllen: Name der Inhaberin, Anschrift, Telefon, E-Mail, ggf. USt-IdNr., zuständige Kammer
- [ ] **Datenschutzerklärung** füllen: Verantwortliche, Kontakt, Stand-Datum

---

## 4. Domain & Veröffentlichung
- [ ] Eigene Domain mit Vercel verbinden (z. B. `hundesalon-emika.de`)
- [ ] Absender-Domain (`FROM_EMAIL`) bei Resend verifizieren (SPF/DKIM)
- [ ] Favicon / Branding final prüfen

---

## 5. End-to-End-Test (nach der Konfiguration)
- [ ] Testbuchung absenden → **Bestätigungs-Mail** kommt beim Kunden an
- [ ] **Benachrichtigungs-Mail** kommt beim Salon an
- [ ] Termin erscheint im **Google-Kalender** (richtiger Mitarbeiter, richtige Uhrzeit)
- [ ] Danach ist der Slot als **belegt** sichtbar (Doppelbuchung gesperrt)
- [ ] Auf echten Geräten testen (iPhone & Android): Menü, Galerie-Scroll, kompletter Buchungsflow

---

## ✅ Bereits erledigt
- Durchgängig responsive (Mobil → Desktop), kein horizontaler Überlauf
- Galerie: Scrollen über Bildern auf dem Handy funktioniert
- Buchung: vollwertiger Monatskalender + wochentagsabhängige Uhrzeiten (geöffnet Mi–Sa 11–17 Uhr)
- Buchung: Mitarbeiter-Auswahl
- Buchung: Doppelbuchungs-Sperre (Code) über den gemeinsamen Google-Kalender
- Automatischer Google-Kalender-Eintrag bei jeder Anfrage (Code)
- „Termin buchen"-Button: zuverlässiges Scrollen zur Buchung (kein kleiner Sprung mehr)
