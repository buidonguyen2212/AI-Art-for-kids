// Vercel Serverless Function — lưu lead vào Google Sheets qua Apps Script Webhook

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SHEET_WEBHOOK = process.env.GOOGLE_SHEET_WEBHOOK;
  if (!SHEET_WEBHOOK) {
    console.warn('GOOGLE_SHEET_WEBHOOK chưa cấu hình — lead sẽ chỉ được log.');
    // Vẫn return OK để frontend không bị lỗi
    console.log('Lead received (no webhook):', JSON.stringify(req.body));
    return res.status(200).json({ ok: true, saved: false, reason: 'no_webhook' });
  }

  try {
    const { email, childName, childAge, timestamp, source } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Thiếu email' });
    }

    // Forward sang Google Apps Script
    const payload = {
      email,
      childName: childName || '',
      childAge: childAge || '',
      timestamp: timestamp || new Date().toISOString(),
      source: source || 'unknown',
      userAgent: req.headers['user-agent'] || '',
      referer: req.headers['referer'] || ''
    };

    const gsRes = await fetch(SHEET_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow' // Apps Script redirects after POST
    });

    if (!gsRes.ok) {
      console.error('Google Sheet webhook error:', gsRes.status);
      // Vẫn return OK cho frontend — lead đã được log
      console.log('Lead (webhook failed):', JSON.stringify(payload));
      return res.status(200).json({ ok: true, saved: false, reason: 'webhook_error' });
    }

    return res.status(200).json({ ok: true, saved: true });

  } catch (err) {
    console.error('Lead API error:', err);
    // Graceful — không để frontend bị lỗi vì lead capture
    return res.status(200).json({ ok: true, saved: false, reason: err.message });
  }
}
