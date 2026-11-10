import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpException, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { LimiteDeTaxaException } from './limite-de-taxa';

// Provedor SIMULADO: nenhuma chamada real à Groq. Toda resposta abaixo é fabricada pelo teste.
vi.mock('axios', () => ({ default: { post: vi.fn() } }));
import axios from 'axios';
import { GroqChatProvider } from './groq-chat.provider';

const post = axios.post as unknown as ReturnType<typeof vi.fn>;
const corpoDe = (e: unknown) => JSON.stringify((e as InternalServerErrorException | ServiceUnavailableException).getResponse());

describe('GroqChatProvider (com axios simulado)', () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.GROQ_API_KEY = 'CHAVE-SIMULADA-NAO-REAL'; });
  afterEach(() => { delete process.env.GROQ_API_KEY; vi.restoreAllMocks(); });

  it('patientContext nulo não derruba a chamada (tratado como contexto vazio)', async () => {
    post.mockResolvedValue({ data: { choices: [{ message: { content: 'resposta simulada' } }] } });
    const r = await new GroqChatProvider().execute('Olá', null as any, []);
    expect(r.reply).toBe('resposta simulada');
    const sistema = post.mock.calls[0][1].messages[0].content as string;
    expect(sistema).toContain('Nenhuma registrada');
  });

  it('patientContext indefinido continua funcionando', async () => {
    post.mockResolvedValue({ data: { choices: [{ message: { content: 'ok' } }] } });
    await expect(new GroqChatProvider().execute('Olá', undefined as any)).resolves.toBeTruthy();
  });

  // Rodada 4: o 429 deixou de cair neste caso (antes esperava 500). Só o 500 e os demais erros seguem genéricos.
  it.each([[500, 'SIMULADO: erro interno do provedor'], [400, 'SIMULADO: requisição inválida']])(
    'erro %s do provedor: a resposta ao cliente NÃO traz o corpo bruto do provedor, mas o log do servidor traz',
    async (status, texto) => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      post.mockRejectedValue({ response: { status, data: { error: { message: texto } } }, message: 'falhou' });
      let erro: unknown;
      try { await new GroqChatProvider().execute('Olá', {}, []); } catch (e) { erro = e; }
      expect(erro).toBeInstanceOf(InternalServerErrorException);
      expect(corpoDe(erro)).not.toContain(texto);        // nada do provedor volta ao navegador
      expect(corpoDe(erro)).not.toContain('detail');
      expect(corpoDe(erro)).toContain('Assistente clínico indisponível.');
      expect(log).toHaveBeenCalled();                      // o log do servidor foi mantido
      expect(JSON.stringify(log.mock.calls)).toContain(texto);
    },
  );

  const pegar = async (err: unknown) => { post.mockRejectedValue(err); try { await new GroqChatProvider().execute('Olá', {}, []); } catch (e) { return e as HttpException; } return undefined; };

  it('429 do provedor: HTTP 429 com a mensagem do pedido, sem o corpo do provedor e sem Retry-After inventado', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const erro = await pegar({ response: { status: 429, data: { error: { message: 'SIMULADO: limite de requisições' } }, headers: {} }, message: 'falhou' });
    expect(erro).toBeInstanceOf(LimiteDeTaxaException);
    expect(erro!.getStatus()).toBe(429);
    expect(erro!.getResponse()).toEqual({ statusCode: 429, message: 'O assistente de IA está com muitas solicitações no momento. Aguarde cerca de um minuto e tente novamente.' });
    expect(corpoDe(erro)).not.toContain('SIMULADO');
    expect((erro as LimiteDeTaxaException).retryAfter).toBeUndefined();
    expect(log).toHaveBeenCalled();
  });

  it('429 com retry-after do provedor: guarda o valor para o cabeçalho Retry-After', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const erro = await pegar({ response: { status: 429, data: {}, headers: { 'retry-after': '30' } }, message: 'falhou' });
    expect((erro as LimiteDeTaxaException).retryAfter).toBe('30');
  });

  it('429 com retry-after em formato estranho (data ou texto): descarta, não inventa valor', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const erro = await pegar({ response: { status: 429, data: {}, headers: { 'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT' } }, message: 'falhou' });
    expect((erro as LimiteDeTaxaException).retryAfter).toBeUndefined();
  });

  it('timeout do provedor também não vaza detalhe', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    post.mockRejectedValue(Object.assign(new Error('timeout of 30000ms exceeded'), { code: 'ECONNABORTED' }));
    let erro: unknown;
    try { await new GroqChatProvider().execute('Olá', {}, []); } catch (e) { erro = e; }
    expect(corpoDe(erro)).not.toContain('timeout of');
  });

  it('sem GROQ_API_KEY: 503 sem citar ".env" e sem chamar o provedor', async () => {
    delete process.env.GROQ_API_KEY;
    let erro: unknown;
    try { await new GroqChatProvider().execute('Olá', {}, []); } catch (e) { erro = e; }
    expect(erro).toBeInstanceOf(ServiceUnavailableException);
    expect(corpoDe(erro)).not.toMatch(/\.env/i);
    expect(post).not.toHaveBeenCalled();
  });
});

// Não prova: o formato real dos erros da Groq, a latência, o consumo de tokens nem a qualidade clínica das
// respostas; o modelo e o contexto enviados NÃO foram alterados nem avaliados por este teste.
