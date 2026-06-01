// Hundesalon Emika — Buchungsbestätigung per E-Mail (Resend)
//
// Serverless Function für Vercel / Netlify / Cloudflare Pages.
// Wird aufgerufen wenn der Kunde im Formular "Anfrage senden" drückt.
//
// Was passiert:
//   1. Formular-Daten validieren
//   2. Bestätigungs-E-Mail an Kunden via Resend
//   3. Notification-E-Mail an Inhaberin
//
// Voraussetzungen (Umgebungsvariablen im Hosting):
//   RESEND_API_KEY    - API-Key aus resend.com Dashboard
//   FROM_EMAIL        - Absender, z.B. "Hundesalon Emika <termine@hundesalon-emika.de>"
//                       (Domain muss in Resend verifiziert sein)
//   OWNER_EMAIL       - E-Mail der Inhaberin für Notifications
//
// Free Tier von Resend: 3000 E-Mails/Monat, 100/Tag — reicht locker.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, dog, notes, size, service, day, time, price } = req.body || {};

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

  const firstName = String(name).split(/\s+/)[0];
  const safe = (s) => String(s).replace(/[<>&"']/g, c => ({
    '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'
  }[c]));

  // ── Kunden-Bestätigung ────────────────────────────────────────────────
  const customerSubject = `Deine Terminanfrage bei Hundesalon Emika 🐾`;
  const customerHtml = renderEmail({
    title: `Hallo ${safe(firstName)},`,
    intro: `danke für deine Terminanfrage bei <b>Hundesalon Emika</b>! Wir haben deine Anfrage erhalten und melden uns in Kürze persönlich zur finalen Bestätigung.`,
    rows: [
      ['Für',         safe(dog)],
      ['Größe',       safe(size)],
      ['Leistung',    safe(service)],
      ['Wunschtermin', `${safe(day)} um ${safe(time)} Uhr`],
      ['Richtpreis',  `ab ${safe(price)} €`],
    ],
    outro: `Falls du Fragen hast oder etwas anpassen möchtest, antworte einfach auf diese E-Mail.<br><br>Wir freuen uns auf euch! 🐶<br>— Hundesalon Emika, Münster`,
  });
  const customerText =
    `Hallo ${firstName},\n\n` +
    `danke für deine Terminanfrage bei Hundesalon Emika. Wir haben deine Anfrage erhalten und melden uns in Kürze persönlich zur Bestätigung.\n\n` +
    `Für: ${dog}\nGröße: ${size}\nLeistung: ${service}\n` +
    `Wunschtermin: ${day}, ${time} Uhr\nRichtpreis: ab ${price} €\n\n` +
    `Falls du Fragen hast, antworte einfach auf diese E-Mail.\n\n` +
    `— Hundesalon Emika, Münster`;

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
      ['Wunschtermin', `${safe(day)} um ${safe(time)} Uhr`],
      ['Richtpreis',  `ab ${safe(price)} €`],
      ...(notes ? [['Anmerkung', safe(notes)]] : []),
    ],
    outro: `Antworte direkt auf diese E-Mail um den Kunden zu kontaktieren.`,
  });

  try {
    // Kunde zuerst — kritisch
    await sendEmail({
      apiKey, from, to: email, replyTo: owner || undefined,
      subject: customerSubject, html: customerHtml, text: customerText,
    });

    // Inhaberin — best-effort, blockiert nicht die Kundenbestätigung
    if (owner) {
      sendEmail({
        apiKey, from, to: owner, replyTo: email,
        subject: ownerSubject, html: ownerHtml,
      }).catch(err => console.error('Inhaberin-Mail fehlgeschlagen:', err));
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Resend-Versand fehlgeschlagen:', err);
    return res.status(502).json({ error: 'E-Mail konnte nicht gesendet werden' });
  }
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
<head><meta charset="UTF-8"><title>Hundesalon Emika</title></head>
<body style="margin:0;padding:0;background:#FFF6FA;font-family:-apple-system,system-ui,'Segoe UI',sans-serif;color:#3C2A35">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF6FA;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 6px 24px rgba(60,30,50,.08)">
        <tr><td style="background:#FF5BA8;padding:24px 32px;color:#fff">
          <div style="font-size:24px;font-weight:700">🐾 Hundesalon Emika</div>
          <div style="font-size:13px;opacity:.9;margin-top:4px">Liebevolle Fellpflege · Münster</div>
        </td></tr>
        <tr><td style="padding:28px 32px">
          <h2 style="margin:0 0 12px;font-size:22px;color:#3C2A35">${title}</h2>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3C2A35">${intro}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF0F7;border-radius:14px;padding:16px 20px">${rowsHtml}</table>
          <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#90788A">${outro}</p>
        </td></tr>
        <tr><td style="background:#FFF0F7;padding:18px 32px;font-size:12px;color:#90788A;text-align:center">
          Hundesalon Emika · An d. Alten Ziegelei 36A · 48157 Münster
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
