const { sendMessage } = require('./lib/whatsapp');
const { getAIReply } = require('./lib/openai');

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

  // Expired or new — start fresh
  const messages = [];
  conversations.set(phone, { messages, lastActivity: now });
  return messages;
}

// Lazy cleanup: remove expired entries on each request
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
        console.log('Webhook verified');
        return res.status(200).send(challenge);
      }

      return res.status(403).send('Forbidden');
    }

    // POST — incoming WhatsApp message
    if (req.method === 'POST') {
      const body = req.body;

      const entry = body?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;

      // Ignore status updates (delivered, read, etc.)
      if (!value?.messages) {
        return res.status(200).send('OK');
      }

      const message = value.messages[0];

      // Only handle text messages for now
      if (message.type !== 'text') {
        return res.status(200).send('OK');
      }

      const from = message.from;
      const text = message.text.body;

      console.log(`Message from ${from}: ${text}`);

      // Cleanup expired conversations
      cleanup();

      // Get or create conversation history
      const history = getConversation(from);
      history.push({ role: 'user', content: text });

      // Cap history to last 20 messages to control token usage
      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }

      // Get AI reply
      const reply = await getAIReply(history);
      history.push({ role: 'assistant', content: reply });

      // Send reply via WhatsApp
      await sendMessage(from, reply);

      console.log(`Reply to ${from}: ${reply}`);
      return res.status(200).send('OK');
    }

    return res.status(405).send('Method not allowed');
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(200).send('OK');
  }
};
