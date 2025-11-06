export type Msg = { role: 'user' | 'assistant' | 'system'; content: string };

export function buildPayload(messages: Msg[], model = process.env.MISTRAL_MODEL || 'mistral-small-latest') {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages must be a non-empty array');
  }
  return {
    model,
    messages,
    temperature: 0.2,
    max_tokens: 256,
  };
}

export function fakeReplyText(input: string, model = process.env.MISTRAL_MODEL || 'mistral-small-latest') {
  const text = (input || '').trim();
  return text ? `FAKE[${model}] → tu as dit « ${text} »`
              : `FAKE[${model}] → dis-moi quelque chose 🙂`;
}
