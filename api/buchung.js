// Hundesalon Luna — Buchungsbestätigung per E-Mail (Resend) + Google-Kalender
//
// Serverless Function für Vercel / Netlify / Cloudflare Pages.
// Wird aufgerufen wenn der Kunde im Formular "Anfrage senden" drückt.
//
// Was passiert:
//   1. Formular-Daten validieren
//   2. Bestätigungs-E-Mail an Kunden via Resend
//   3. Notification-E-Mail an Inhaberin
//   4. Termin automatisch in den Google-Kalender eintragen (wenn konfiguriert)
//
// Voraussetzungen (Umgebungsvariablen im Hosting):
//   RESEND_API_KEY        - API-Key aus resend.com Dashboard
//   FROM_EMAIL            - Absender, z.B. "Hundesalon Luna <termine@hundesalon-luna.de>"
//                           (Domain muss in Resend verifiziert sein)
//   OWNER_EMAIL           - E-Mail der Inhaberin für Notifications
//
//   Google-Kalender (optional — fehlt eine Variable, wird der Eintrag still übersprungen):
//   GOOGLE_SA_EMAIL       - client_email des Google-Service-Accounts
//   GOOGLE_SA_PRIVATE_KEY - private_key des Service-Accounts (PEM, \n als echte Zeilenumbrüche
//                           ODER als "\n" maskiert — beides wird unterstützt)
//   GOOGLE_CALENDAR_ID    - ID des Kalenders, der mit dem Service-Account geteilt wurde
//                           (z.B. die E-Mail-Adresse des Kalenders)
//   APPT_DURATION_MIN     - Termindauer in Minuten (optional, Standard 60)
//   APPT_TIMEZONE         - Zeitzone (optional, Standard "Europe/Berlin")
//
// Free Tier von Resend: 3000 E-Mails/Monat, 100/Tag — reicht locker.

import { createSign } from 'node:crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, dog, notes, size, service, staff, staffName, day, dayKey, time, price } = req.body || {};

  if (!name || !email || !dog || !day || !time || !service || !size) {
    return res.status(400).json({ error: 'Fehlende Pflichtfelder' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.FROM_EMAIL;
  const owner  = process.env.OWNER_EMAIL;

  if (!apiKey || !from) {
    return res.status(500).json({ error: 'E-Mail-Dienst nicht konfiguriert' });
  }

  const gcalConfigured = !!(process.env.GOOGLE_SA_EMAIL && process.env.GOOGLE_SA_PRIVATE_KEY && process.env.GOOGLE_CALENDAR_ID);

  // Doppelbuchung serverseitig prüfen, bevor wir bestätigen (nur wenn Kalender konfiguriert).
  if (gcalConfigured && dayKey && time && staff) {
    try {
      const taken = await getBookedTimes({ dayKey, staff });
      if (taken.includes(time)) {
        return res.status(409).json({ error: 'Dieser Termin wurde leider gerade vergeben. Bitte wähle eine andere Uhrzeit.' });
      }
    } catch (err) {
      console.error('Verfügbarkeitsprüfung fehlgeschlagen:', err);
      // Im Zweifel nicht blockieren — lieber buchen lassen als Kunde abweisen.
    }
  }

  const firstName = String(name).split(/\s+/)[0];
  const safe = (s) => String(s).replace(/[<>&"']/g, c => ({
    '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'
  }[c]));

  // ── Kunden-Bestätigung ────────────────────────────────────────────────
  const customerSubject = `Deine Terminanfrage bei Hundesalon Luna 🐾`;
  const customerHtml = renderEmail({
    title: `Hallo ${safe(firstName)},`,
    intro: `danke für deine Terminanfrage bei <b>Hundesalon Luna</b>! Wir haben deine Anfrage erhalten und melden uns in Kürze persönlich zur finalen Bestätigung.`,
    rows: [
      ['Für',         safe(dog)],
      ['Größe',       safe(size)],
      ['Leistung',    safe(service)],
      ...(staffName ? [['Mitarbeiter', safe(staffName)]] : []),
      ['Wunschtermin', `${safe(day)} um ${safe(time)} Uhr`],
      ['Richtpreis',  `ab ${safe(price)} €`],
    ],
    outro: `Falls du Fragen hast oder etwas anpassen möchtest, antworte einfach auf diese E-Mail.<br><br>Wir freuen uns auf euch! 🐶<br>— Hundesalon Luna, Musterstadt`,
  });
  const customerText =
    `Hallo ${firstName},\n\n` +
    `danke für deine Terminanfrage bei Hundesalon Luna. Wir haben deine Anfrage erhalten und melden uns in Kürze persönlich zur Bestätigung.\n\n` +
    `Für: ${dog}\nGröße: ${size}\nLeistung: ${service}\n` +
    (staffName ? `Mitarbeiter: ${staffName}\n` : ``) +
    `Wunschtermin: ${day}, ${time} Uhr\nRichtpreis: ab ${price} €\n\n` +
    `Falls du Fragen hast, antworte einfach auf diese E-Mail.\n\n` +
    `— Hundesalon Luna, Musterstadt`;

  // ── Inhaberin-Notification ────────────────────────────────────────────
  const ownerSubject = `🐾 Neue Terminanfrage: ${name} für ${dog}`;
  const ownerHtml = renderEmail({
    title: `Neue Terminanfrage`,
    intro: `Ein neuer Kunde hat eine Anfrage über die Website abgeschickt:`,
    rows: [
      ['Name',        safe(name)],
      ['E-Mail',      `<a href="mailto:${safe(email)}">${safe(email)}</a>`],
      ['Hund',        safe(dog)],
      ['Größe',       safe(size)],
      ['Leistung',    safe(service)],
      ...(staffName ? [['Mitarbeiter', safe(staffName)]] : []),
      ['Wunschtermin', `${safe(day)} um ${safe(time)} Uhr`],
      ['Richtpreis',  `ab ${safe(price)} €`],
      ...(notes ? [['Anmerkung', safe(notes)]] : []),
    ],
    outro: `Antworte direkt auf diese E-Mail um den Kunden zu kontaktieren.`,
  });

  // Kunden-Bestätigung — kritisch: schlägt das fehl, melden wir einen Fehler.
  try {
    await sendEmail({
      apiKey, from, to: email, replyTo: owner || undefined,
      subject: customerSubject, html: customerHtml, text: customerText,
    });
  } catch (err) {
    console.error('Resend-Versand fehlgeschlagen:', err);
    return res.status(502).json({ error: 'E-Mail konnte nicht gesendet werden' });
  }

  // Inhaberin-Benachrichtigung — wichtig, aber nicht kritisch für den Kunden.
  if (owner) {
    try {
      await sendEmail({
        apiKey, from, to: owner, replyTo: email,
        subject: ownerSubject, html: ownerHtml,
      });
    } catch (err) {
      console.error('Inhaberin-Mail fehlgeschlagen:', err);
    }
  }

  // Google-Kalender-Eintrag — nur wenn vollständig konfiguriert, sonst still übersprungen.
  if (gcalConfigured) {
    try {
      await addToCalendar({ name, email, dog, notes, size, service, staff, staffName, day, dayKey, time, price });
    } catch (err) {
      console.error('Google-Kalender-Eintrag fehlgeschlagen:', err);
    }
  }

  return res.status(200).json({ ok: true });
}

// ──────────────────────────────────────────────────────────────────────────
// Google Kalender: Termin als Event eintragen (via Service-Account, ohne externe Pakete).
async function addToCalendar({ name, email, dog, notes, size, service, staff, staffName, day, dayKey, time, price }) {
  if (!dayKey || !/^\d{4}-\d{2}-\d{2}$/.test(String(dayKey))) {
    throw new Error('Ungültiges/fehlendes Datum (dayKey) für den Kalender');
  }
  if (!/^\d{1,2}:\d{2}$/.test(String(time || ''))) {
    throw new Error('Ungültige/fehlende Uhrzeit (time) für den Kalender');
  }

  const tz = process.env.APPT_TIMEZONE || 'Europe/Berlin';
  const durationMin = parseInt(process.env.APPT_DURATION_MIN || '60', 10) || 60;
  const pad = (n) => String(n).padStart(2, '0');
  const [h, m] = String(time).split(':').map(Number);
  const startMin = h * 60 + m;
  const endMin = startMin + durationMin;
  const startISO = `${dayKey}T${pad(h)}:${pad(m)}:00`;
  const endISO   = `${dayKey}T${pad(Math.floor(endMin / 60) % 24)}:${pad(endMin % 60)}:00`;

  const accessToken = await getGoogleAccessToken({
    email: process.env.GOOGLE_SA_EMAIL,
    privateKey: String(process.env.GOOGLE_SA_PRIVATE_KEY).replace(/\\n/g, '\n'),
  });

  const event = {
    summary: `🐾 ${staffName ? staffName + ' · ' : ''}${service} – ${dog} (${name})`,
    description:
      `Online-Terminanfrage über die Website.\n\n` +
      `Kunde: ${name}\n` +
      `E-Mail: ${email}\n` +
      `Hund: ${dog}\n` +
      `Größe: ${size}\n` +
      `Leistung: ${service}\n` +
      (staffName ? `Mitarbeiter: ${staffName}\n` : '') +
      `Richtpreis: ab ${price} €` +
      (notes ? `\nAnmerkung: ${notes}` : '') +
      `\n\n(Hinweis: noch nicht final bestätigt — bitte beim Kunden rückmelden.)`,
    start: { dateTime: startISO, timeZone: tz },
    end:   { dateTime: endISO,   timeZone: tz },
    // Marker, um Termine pro Mitarbeiter zu erkennen (Doppelbuchungs-Sperre).
    extendedProperties: { private: { staff: staff || '', source: 'website' } },
  };

  const calId = process.env.GOOGLE_CALENDAR_ID;
  const r = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }
  );
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Calendar ${r.status}: ${t.slice(0, 300)}`);
  }
  return r.json();
}

// Belegte Uhrzeiten (HH:MM) für einen Tag + Mitarbeiter aus dem Google-Kalender lesen.
async function getBookedTimes({ dayKey, staff }) {
  const accessToken = await getGoogleAccessToken({
    email: process.env.GOOGLE_SA_EMAIL,
    privateKey: String(process.env.GOOGLE_SA_PRIVATE_KEY).replace(/\\n/g, '\n'),
  });
  return listBookedTimes({
    accessToken,
    calId: process.env.GOOGLE_CALENDAR_ID,
    dayKey,
    staff,
    tz: process.env.APPT_TIMEZONE || 'Europe/Berlin',
  });
}

// Termine eines Tages auflisten und die belegten Startzeiten zurückgeben.
// Ein Event zählt für den Mitarbeiter, wenn es mit dessen Kennung getaggt ist
// ODER kein Mitarbeiter-Tag hat (z.B. manuell eingetragene Termine blockieren alle).
async function listBookedTimes({ accessToken, calId, dayKey, staff, tz }) {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '2500',
    timeMin: `${dayKey}T00:00:00Z`,
    timeMax: `${dayKey}T23:59:59Z`,
    timeZone: tz,
  });
  const r = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?${params.toString()}`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Calendar list ${r.status}: ${t.slice(0, 200)}`);
  }
  const data = await r.json();
  const items = Array.isArray(data.items) ? data.items : [];
  const booked = [];
  for (const ev of items) {
    if (ev.status === 'cancelled') continue;
    const dt = ev.start && ev.start.dateTime;
    if (!dt) continue; // ganztägige Einträge ignorieren
    if (dt.slice(0, 10) !== dayKey) continue;
    const tag = ev.extendedProperties && ev.extendedProperties.private && ev.extendedProperties.private.staff;
    // Mit Tag: nur für diesen Mitarbeiter sperren. Ohne Tag: für alle sperren.
    if (staff && tag && tag !== staff) continue;
    const m = dt.match(/T(\d{2}:\d{2})/);
    if (m) booked.push(m[1]);
  }
  return booked;
}

// OAuth2 Access-Token für den Service-Account holen (JWT-Bearer-Flow, RS256-signiert).
async function getGoogleAccessToken({ email, privateKey }) {
  if (!email || !privateKey) throw new Error('Service-Account-Zugangsdaten fehlen');

  const now = Math.floor(Date.now() / 1000);
  const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned =
    `${b64url({ alg: 'RS256', typ: 'JWT' })}.` +
    `${b64url({
      iss: email,
      scope: 'https://www.googleapis.com/auth/calendar',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })}`;

  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = signer.sign(privateKey).toString('base64url');
  const assertion = `${unsigned}.${signature}`;

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Google-Token ${r.status}: ${t.slice(0, 300)}`);
  }
  const j = await r.json();
  if (!j.access_token) throw new Error('Kein access_token von Google erhalten');
  return j.access_token;
}

// ──────────────────────────────────────────────────────────────────────────
async function sendEmail({ apiKey, from, to, replyTo, subject, html, text }) {
  const body = { from, to, subject, html };
  if (text)    body.text = text;
  if (replyTo) body.reply_to = replyTo;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const errText = await r.text().catch(() => '');
    throw new Error(`Resend ${r.status}: ${errText.slice(0, 300)}`);
  }
  return r.json();
}

// ──────────────────────────────────────────────────────────────────────────
// Schlichtes HTML-E-Mail-Template mit Salon-Branding (rosa Akzent).
function renderEmail({ title, intro, rows, outro }) {
  const rowsHtml = rows.map(([k, v]) =>
    `<tr><td style="padding:8px 0;color:#90788A;font-size:14px;width:140px">${k}</td>` +
    `<td style="padding:8px 0;color:#3C2A35;font-size:15px;font-weight:600">${v}</td></tr>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><title>Hundesalon Luna</title></head>
<body style="margin:0;padding:0;background:#FFF6FA;font-family:-apple-system,system-ui,'Segoe UI',sans-serif;color:#3C2A35">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF6FA;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 6px 24px rgba(60,30,50,.08)">
        <tr><td style="background:#FF5BA8;padding:24px 32px;color:#fff">
          <div style="font-size:24px;font-weight:700">🐾 Hundesalon Luna</div>
          <div style="font-size:13px;opacity:.9;margin-top:4px">Liebevolle Fellpflege · Musterstadt</div>
        </td></tr>
        <tr><td style="padding:28px 32px">
          <h2 style="margin:0 0 12px;font-size:22px;color:#3C2A35">${title}</h2>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3C2A35">${intro}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF0F7;border-radius:14px;padding:16px 20px">${rowsHtml}</table>
          <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#90788A">${outro}</p>
        </td></tr>
        <tr><td style="background:#FFF0F7;padding:18px 32px;font-size:12px;color:#90788A;text-align:center">
          Hundesalon Luna · Musterstraße 1 · 12345 Musterstadt
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
