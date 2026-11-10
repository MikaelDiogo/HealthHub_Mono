import { describe, it, expect } from 'vitest';
import { mensagemDeErroDaIa, ehLimiteDaIa, ERRO_GENERICO_IA } from './aiErro';

// Esperados escritos à mão a partir do pedido da rodada 4.
const MSG_429 = 'O assistente de IA está com muitas solicitações no momento. Aguarde cerca de um minuto e tente novamente.';
const erro = (status: number, data?: unknown) => ({ response: { status, data } });

describe('mensagemDeErroDaIa', () => {
  it('429 com message do backend: mostra a message do backend', () => {
    expect(mensagemDeErroDaIa(erro(429, { statusCode: 429, message: MSG_429 }))).toBe(MSG_429);
  });
  it('429 sem message (corpo vazio ou message vazia): cai no texto genérico', () => {
    expect(mensagemDeErroDaIa(erro(429))).toBe(ERRO_GENERICO_IA);
    expect(mensagemDeErroDaIa(erro(429, { message: '  ' }))).toBe(ERRO_GENERICO_IA);
  });
  it('outros erros mantêm "Erro ao conectar com o assistente.", mesmo com message no corpo', () => {
    expect(ERRO_GENERICO_IA).toBe('Erro ao conectar com o assistente.');
    expect(mensagemDeErroDaIa(erro(500, { error: 'Assistente clínico indisponível.' }))).toBe(ERRO_GENERICO_IA);
    expect(mensagemDeErroDaIa(erro(503, { error: 'Assistente clínico não configurado neste ambiente.' }))).toBe(ERRO_GENERICO_IA);
    expect(mensagemDeErroDaIa(erro(400, { message: 'qualquer coisa' }))).toBe(ERRO_GENERICO_IA);
  });
  it('sem resposta (falha de rede) ou valor estranho: texto genérico', () => {
    expect(mensagemDeErroDaIa(new Error('Network Error'))).toBe(ERRO_GENERICO_IA);
    expect(mensagemDeErroDaIa(null)).toBe(ERRO_GENERICO_IA);
    expect(mensagemDeErroDaIa(undefined)).toBe(ERRO_GENERICO_IA);
  });
});

describe('ehLimiteDaIa', () => {
  it('só o status 429', () => {
    expect(ehLimiteDaIa(erro(429))).toBe(true);
    expect(ehLimiteDaIa(erro(500))).toBe(false);
    expect(ehLimiteDaIa(new Error('x'))).toBe(false);
  });
});
