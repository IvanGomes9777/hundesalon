// Hundesalon Luna — Verfügbarkeit / belegte Uhrzeiten (Doppelbuchungs-Sperre)
//
// GET /api/verfuegbarkeit?day=YYYY-MM-DD&staff=<id>
// Antwort: { booked: ["10:00","14:00"], configured: true }
//
// Liest die belegten Startzeiten eines Tages für einen Mitarbeiter aus dem
// gemeinsamen Google-Kalender. Verwendet dieselben Umgebungsvariablen wie
// api/buchung.js: GOOGLE_SA_EMAIL, GOOGLE_SA_PRIVATE_KEY, GOOGLE_CALENDAR_ID
// (optional APPT_TIMEZONE). Fehlt die Konfiguration, gilt alles als frei.

import { createSign } from 'node:crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET')     return res.status(405).json({ error: 'Method not allowed' });

  const day   = String((req.query && req.query.day)   || '');
  const staff = String((req.query && req.query.staff) || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return res.status(400).json({ error: 'Ungültiges Datum' });
  }

  const configured = !!(process.env.GOOGLE_SA_EMAIL && process.env.GOOGLE_SA_PRIVATE_KEY && process.env.GOOGLE_CALENDAR_ID);
  if (!configured) {
    // Ohne Kalender-Anbindung können wir nichts sperren — alles frei.
    return res.status(200).json({ booked: [], configured: false });
  }

  try {
    const accessToken = await getGoogleAccessToken({
      email: process.env.GOOGLE_SA_EMAIL,
      privateKey: String(process.env.GOOGLE_SA_PRIVATE_KEY).replace(/\\n/g, '\n'),
    });
    const booked = await listBookedTimes({
      accessToken,
      calId: process.env.GOOGLE_CALENDAR_ID,
      dayKey: day,
      staff: staff || null,
      tz: process.env.APPT_TIMEZONE || 'Europe/Berlin',
    });
    return res.status(200).json({ booked, configured: true });
  } catch (err) {
    console.error('Verfügbarkeit fehlgeschlagen:', err);
    // Im Fehlerfall nicht blockieren — Frontend behandelt leere Liste als „alles frei".
    return res.status(200).json({ booked: [], configured: true, error: 'lookup_failed' });
  }
}

// ── Helfer (identisch zu api/buchung.js — separate Serverless-Funktion) ─────
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

async function getGoogleAccessToken({ email, privateKey }) {
  if (!email || !privateKey) throw new Error('Service-Account-Zugangsdaten fehlen');

  const now = Math.floor(Date.now() / 1000);
  const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned =
    `${b64url({ alg: 'RS256', typ: 'JWT' })}.` +
    `${b64url({
      iss: email,
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
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
