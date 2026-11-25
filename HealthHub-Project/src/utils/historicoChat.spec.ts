import { describe, it, expect } from 'vitest';
import { montarHistorico, type MensagemDoChat } from './historicoChat';

// Esperados escritos à mão a partir do pedido 7 (Passo 1.3a): a requisição não inclui a saudação.
const NOME = 'Paciente Fictício Teste';
const saudacao: MensagemDoChat = { sender: 'ai', text: `Olá! Analisando **${NOME}**. Como posso ajudar neste caso?`, local: true };

describe('montarHistorico', () => {
  it('a saudação inicial (local) NÃO entra no histórico', () => {
    const h = montarHistorico([saudacao, { sender: 'user', text: 'dor lombar' }]);
    expect(h).toEqual([{ role: 'user', content: 'dor lombar' }]);
    expect(JSON.stringify(h)).not.toContain(NOME);
    expect(JSON.stringify(h)).not.toContain('Analisando');
  });
  it('só a saudação: histórico vazio', () => { expect(montarHistorico([saudacao])).toEqual([]); });
  it('converte os papéis e mantém as últimas 4 mensagens não locais, na ordem', () => {
    const msgs: MensagemDoChat[] = [saudacao, { sender: 'user', text: 'u1' }, { sender: 'ai', text: 'a1' }, { sender: 'user', text: 'u2' }, { sender: 'ai', text: 'a2' }, { sender: 'user', text: 'u3' }];
    expect(montarHistorico(msgs)).toEqual([
      { role: 'assistant', content: 'a1' }, { role: 'user', content: 'u2' }, { role: 'assistant', content: 'a2' }, { role: 'user', content: 'u3' },
    ]);
  });
  it('mensagem normal do assistente (não local) continua indo', () => {
    expect(montarHistorico([saudacao, { sender: 'ai', text: 'Resposta da IA' }])).toEqual([{ role: 'assistant', content: 'Resposta da IA' }]);
  });
});
