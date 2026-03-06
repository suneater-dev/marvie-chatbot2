const OpenAI = require('openai');
const { SYSTEM_PROMPT } = require('./system-prompt');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getAIReply(conversationHistory) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory,
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 500,
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}

module.exports = { getAIReply };
