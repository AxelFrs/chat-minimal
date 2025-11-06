import { describe, it, expect } from 'vitest';
import { buildPayload, fakeReplyText } from '../lib/chat';

describe('buildPayload', () => {
  it('construit un payload avec valeurs par défaut', () => {
    const payload = buildPayload([{ role: 'user', content: 'Hello' }]);
    expect(payload.model).toBeDefined();
    expect(payload.messages[0].content).toBe('Hello');
    expect(payload.temperature).toBe(0.2);
    expect(payload.max_tokens).toBe(256);
  });

  it('rejette un tableau vide', () => {
    expect(() => buildPayload([] as any)).toThrow();
  });
});

describe('fakeReplyText', () => {
  it('répond avec le texte fourni', () => {
    const out = fakeReplyText('hello');
    expect(out).toContain('hello');
    expect(out).toContain('FAKE[');
  });

  it('invite à parler si vide', () => {
    const out = fakeReplyText('');
    expect(out).toContain('dis-moi quelque chose');
  });
});
