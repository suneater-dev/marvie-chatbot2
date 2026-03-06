// Debug endpoint: GET /api/send-test?to=628xxxxx
// Sends a test message directly to verify WhatsApp API works
module.exports = async function handler(req, res) {
  const to = req.query.to;
  if (!to) {
    return res.status(400).json({ error: 'Missing ?to=phone_number' });
  }

  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN;

  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: 'Halo! Ini test message dari Marvie Beauty Bot.' },
      }),
    });

    const data = await response.json();
    return res.status(200).json({ status: response.status, data, phoneId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
