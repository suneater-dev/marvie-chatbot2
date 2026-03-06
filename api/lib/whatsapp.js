const WHATSAPP_API = 'https://graph.facebook.com/v21.0';

async function sendMessage(to, text) {
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN;

  const res = await fetch(`${WHATSAPP_API}/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('WhatsApp API error:', err);
    throw new Error(`WhatsApp API error: ${res.status}`);
  }

  return res.json();
}

module.exports = { sendMessage };
