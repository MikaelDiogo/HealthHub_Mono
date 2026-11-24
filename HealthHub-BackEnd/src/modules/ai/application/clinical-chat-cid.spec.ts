// Fluxo do chat com a conferência de CID, com provedor SIMULADO (nenhuma chamada à Groq). A tabela usada é a oficial do repositório.
// Esperados escritos à mão a partir do pedido da rodada 5; as descrições são lidas do CSV pelo próprio teste.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HttpException, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { ClinicalChatService } from './clinical-chat.service';
import { Cid10Service } from './cid10.service';
import { CABECALHO_CONFERENCIA } from './cid10-extracao';
import { LimiteDeTaxaException } from '../infrastructure/limite-de-taxa';
import type { IAiChatProvider } from '../domain/ai-chat-provider.interface';

const SUB = readFileSync(join(__dirname, '..', 'data', 'cid10', 'CID-10-SUBCATEGORIAS.CSV')).toString('latin1').split('\r\n').slice(1, -1).map((l) => l.split(';'));
const descSub = (cod: string) => SUB.find((c) => c[0] === cod)![4];

const simulado = (impl: IAiChatProvider['execute']) => ({ execute: vi.fn(impl) });

describe('chat: bloco de conferência de CID', () => {
  it('um código válido e um inválido: o bloco traz a descrição OFICIAL do arquivo e o aviso, e o texto do modelo fica intacto', async () => {
    const texto = 'Hipóteses: hipertensão.\nCID-10: I10 – texto QUE O MODELO ESCREVEU; E99.9 – código inventado';
    const prov = simulado(async () => ({ reply: texto, source: 'groq' }));
    const out = await new ClinicalChatService(prov).execute('pergunta', {}, []);
    expect(out.source).toBe('groq');
    expect(out.reply.startsWith(texto + '\n\n')).toBe(true);
    expect(out.reply.slice(texto.length + 2)).toBe([
      CABECALHO_CONFERENCIA,
      `- I10 – ${descSub('I10')}: consta na tabela.`,
      '- E999 – não consta na tabela CID-10 do DATASUS (versão 2008).',
    ].join('\n'));
    expect(out.reply).not.toContain('QUE O MODELO ESCREVEU' + ': consta'); // a descrição do bloco não é a do modelo
  });

  it('resposta sem CID não muda nada', async () => {
    const prov = simulado(async () => ({ reply: 'Medir a pressão e reavaliar em 1 hora.', source: 'groq' }));
    expect((await new ClinicalChatService(prov).execute('p', {}, [])).reply).toBe('Medir a pressão e reavaliar em 1 hora.');
  });

  it('resposta truncada (limite de tokens) que já citou CID também recebe o bloco', async () => {
    const prov = simulado(async () => ({ reply: 'CID-10: J18.9 – Pneumonia não espec', source: 'groq' }));
    const out = await new ClinicalChatService(prov).execute('p', {}, []);
    expect(out.reply).toContain(`- J189 – ${descSub('J189')}: consta na tabela.`);
  });

  it('o contrato da resposta não muda: só { reply, source }', async () => {
    const prov = simulado(async () => ({ reply: 'CID: I10', source: 'groq' }));
    expect(Object.keys(await new ClinicalChatService(prov).execute('p', {}, [])).sort()).toEqual(['reply', 'source']);
  });

  it('a conferência é local: o que vai ao provedor não contém nada da tabela nem o bloco de respostas anteriores', async () => {
    const prov = simulado(async () => ({ reply: 'ok', source: 'groq' }));
    const anterior = 'Resposta antiga.\nCID-10: I10 – x\n\n' + CABECALHO_CONFERENCIA + `\n- I10 – ${descSub('I10')}: consta na tabela.`;
    await new ClinicalChatService(prov).execute('nova pergunta', {}, [{ role: 'user', content: 'antes' }, { role: 'assistant', content: anterior }]);
    const historicoEnviado = JSON.stringify(prov.execute.mock.calls[0][2]);
    expect(historicoEnviado).not.toContain('Conferência na CID-10');
    expect(historicoEnviado).not.toContain(descSub('I10'));
    expect(historicoEnviado).toContain('Resposta antiga.'); // o resto do histórico segue igual
  });

  it('se a tabela local falhar, a resposta do modelo segue sem o bloco (o chat não quebra)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const cid = new Cid10Service(); cid.pasta = join(__dirname, 'pasta-que-nao-existe');
    const prov = simulado(async () => ({ reply: 'CID-10: I10 – x', source: 'groq' }));
    expect((await new ClinicalChatService(prov, cid).execute('p', {}, [])).reply).toBe('CID-10: I10 – x');
    vi.restoreAllMocks();
  });
});

describe('erros do provedor continuam como na etiqueta tcc-rodada-final-4 (passam sem alteração)', () => {
  beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { vi.restoreAllMocks(); });
  const falha = async (e: unknown) => { try { await new ClinicalChatService(simulado(async () => { throw e; })).execute('p', {}, []); } catch (x) { return x as HttpException; } return undefined; };

  it('429 do provedor segue HTTP 429 com a mensagem própria', async () => {
    const x = await falha(new LimiteDeTaxaException('30'));
    expect(x).toBeInstanceOf(LimiteDeTaxaException);
    expect(x!.getStatus()).toBe(429);
  });
  it('500 genérico segue 500', async () => {
    const x = await falha(new InternalServerErrorException({ error: 'Assistente clínico indisponível.' }));
    expect(x!.getStatus()).toBe(500);
    expect(x!.getResponse()).toEqual({ error: 'Assistente clínico indisponível.' });
  });
  it('503 sem chave segue 503', async () => {
    const x = await falha(new ServiceUnavailableException({ error: 'Assistente clínico não configurado neste ambiente.' }));
    expect(x!.getStatus()).toBe(503);
  });
});
