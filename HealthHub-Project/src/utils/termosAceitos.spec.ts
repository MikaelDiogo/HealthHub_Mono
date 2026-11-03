import { describe, it, expect, beforeEach, vi } from 'vitest';
import { STORAGE_KEY, marcarTermosAceitos, revogarTermosAceitos, useTermosAceitos } from './termosAceitos';

// Ambiente de teste sem navegador: localStorage simulado em memória.
function instalarStorage() {
  const dados = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (dados.has(k) ? dados.get(k)! : null),
    setItem: (k: string, v: string) => { dados.set(k, String(v)); },
    removeItem: (k: string) => { dados.delete(k); },
  });
  return dados;
}

describe('RF22 — aceite dos termos de uso (lógica de gravação; a janela em si não é renderizada aqui)', () => {
  let dados: Map<string, string>;
  beforeEach(() => { dados = instalarStorage(); });

  it('primeiro acesso: termos ainda não aceitos (o Layout abre o modal quando isto é false)', () => {
    expect(useTermosAceitos()).toBe(false);
  });

  it('ao aceitar: grava o aceite (por versão dos termos) e a data em ISO', () => {
    marcarTermosAceitos();
    expect(STORAGE_KEY).toBe('healthhub_termos_aceitos_v1.0');
    expect(dados.get(STORAGE_KEY)).toBe('true');
    expect(Number.isNaN(Date.parse(dados.get('healthhub_termos_data_aceite') ?? ''))).toBe(false);
    expect(useTermosAceitos()).toBe(true);
  });

  it('nos acessos seguintes o aceite continua gravado (o modal não reaparece)', () => {
    marcarTermosAceitos();
    expect(useTermosAceitos()).toBe(true);
    expect(useTermosAceitos()).toBe(true);
  });

  it('uma versão nova dos termos pede novo aceite (a chave inclui a versão)', () => {
    dados.set('healthhub_termos_aceitos_v0.9', 'true');
    expect(useTermosAceitos()).toBe(false);
  });

  it('ao recusar/revogar: remove o aceite e a data', () => {
    marcarTermosAceitos();
    revogarTermosAceitos();
    expect(useTermosAceitos()).toBe(false);
    expect(dados.has('healthhub_termos_data_aceite')).toBe(false);
  });
});
