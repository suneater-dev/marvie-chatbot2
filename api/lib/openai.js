const OpenAI = require('openai');
const { SYSTEM_PROMPT } = require('./system-prompt');

let openai;

function getClient() {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

async function getAIReply(conversationHistory) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory,
  ];

  const response = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 500,
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}

module.exports = { getAIReply };
