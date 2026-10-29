import { describe, it, expect } from 'vitest';
import { parseAiReply } from './aiResponse';

describe('parseAiReply — resposta da IA com formato inválido não deve quebrar a tela', () => {
  it('aceita uma resposta válida', () => {
    const result = parseAiReply({ reply: 'Olá, como posso ajudar?' });
    expect(result).toEqual({ ok: true, reply: 'Olá, como posso ajudar?' });
  });

  it('trata corpo sem o campo reply', () => {
    const result = parseAiReply({});
    expect(result.ok).toBe(false);
  });

  it('trata reply com tipo errado (não-string)', () => {
    const result = parseAiReply({ reply: 12345 });
    expect(result.ok).toBe(false);
  });

  it('trata reply vazio ou só espaços', () => {
    expect(parseAiReply({ reply: '' }).ok).toBe(false);
    expect(parseAiReply({ reply: '   ' }).ok).toBe(false);
  });

  it('trata corpo nulo/undefined sem lançar exceção', () => {
    expect(() => parseAiReply(null)).not.toThrow();
    expect(() => parseAiReply(undefined)).not.toThrow();
    expect(parseAiReply(null).ok).toBe(false);
  });
});
