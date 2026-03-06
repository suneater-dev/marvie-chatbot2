let sendMessage, getAIReply;

try {
  sendMessage = require('./lib/whatsapp').sendMessage;
  getAIReply = require('./lib/openai').getAIReply;
} catch (err) {
  console.error('Module load error:', err);
}

// In-memory conversation store: phone -> { messages, lastActivity }
const conversations = new Map();
const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function getConversation(phone) {
  const now = Date.now();
  const conv = conversations.get(phone);

  if (conv && now - conv.lastActivity < TIMEOUT_MS) {
    conv.lastActivity = now;
    return conv.messages;
  }

  const messages = [];
  conversations.set(phone, { messages, lastActivity: now });
  return messages;
}

function cleanup() {
  const now = Date.now();
  for (const [phone, conv] of conversations) {
    if (now - conv.lastActivity >= TIMEOUT_MS) {
      conversations.delete(phone);
    }
  }
}

module.exports = async function handler(req, res) {
  try {
    // GET — Meta webhook verification
    if (req.method === 'GET') {
      const q = req.query;
      const mode = q['hub.mode'] || q?.hub?.mode;
      const token = q['hub.verify_token'] || q?.hub?.verify_token;
      const challenge = q['hub.challenge'] || q?.hub?.challenge;

      if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
        return res.status(200).send(challenge);
      }

      return res.status(403).json({ error: 'Forbidden', mode, token, envSet: !!process.env.WEBHOOK_VERIFY_TOKEN });
    }

    // POST — incoming WhatsApp message
    if (req.method === 'POST') {
      const body = req.body;
      const entry = body?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;

      if (!value?.messages) {
        return res.status(200).send('OK');
      }

      const message = value.messages[0];
      if (message.type !== 'text') {
        return res.status(200).send('OK');
      }

      const from = message.from;
      const text = message.text.body;

      cleanup();

      const history = getConversation(from);
      history.push({ role: 'user', content: text });

      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }

      const reply = await getAIReply(history);
      history.push({ role: 'assistant', content: reply });

      await sendMessage(from, reply);
      return res.status(200).send('OK');
    }

    return res.status(405).send('Method not allowed');
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(200).json({ error: err.message });
  }
};
