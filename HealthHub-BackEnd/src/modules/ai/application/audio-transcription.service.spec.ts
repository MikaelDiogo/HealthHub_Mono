import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { LimiteDeTaxaException } from '../infrastructure/limite-de-taxa';

// Provedor SIMULADO: nenhuma chamada real à Groq.
vi.mock('axios', () => ({ default: { post: vi.fn() } }));
import axios from 'axios';
import { AudioTranscriptionService } from './audio-transcription.service';

const post = axios.post as unknown as ReturnType<typeof vi.fn>;
const arquivo = { buffer: Buffer.from('bytes de teste'), originalname: 'ditado.webm', mimetype: 'audio/webm', size: 14 } as Express.Multer.File;
const corpoDe = (e: unknown) => JSON.stringify((e as InternalServerErrorException).getResponse());

describe('AudioTranscriptionService (com axios simulado)', () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.GROQ_API_KEY = 'CHAVE-SIMULADA-NAO-REAL'; });
  afterEach(() => { delete process.env.GROQ_API_KEY; vi.restoreAllMocks(); });

  it('devolve a transcrição simulada', async () => {
    post.mockResolvedValue({ data: { text: 'transcrição simulada' } });
    await expect(new AudioTranscriptionService().execute(arquivo)).resolves.toEqual({ transcription: 'transcrição simulada' });
  });

  it('sem GROQ_API_KEY: 503 sem citar ".env" e sem chamar o provedor', async () => {
    delete process.env.GROQ_API_KEY;
    let erro: unknown;
    try { await new AudioTranscriptionService().execute(arquivo); } catch (e) { erro = e; }
    expect(erro).toBeInstanceOf(ServiceUnavailableException);
    expect(corpoDe(erro)).not.toMatch(/\.env/i);
    expect(post).not.toHaveBeenCalled();
  });

  it('erro do provedor: 500 genérico, sem corpo do provedor', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    post.mockRejectedValue({ message: 'Request failed with status code 400', response: { status: 400, data: { error: { message: 'SIMULADO: áudio ilegível' } } } });
    let erro: unknown;
    try { await new AudioTranscriptionService().execute(arquivo); } catch (e) { erro = e; }
    expect(erro).toBeInstanceOf(InternalServerErrorException);
    expect(corpoDe(erro)).not.toContain('SIMULADO');
  });
});

describe('AudioTranscriptionService: limite de requisições (429, simulado)', () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.GROQ_API_KEY = 'CHAVE-SIMULADA-NAO-REAL'; vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { delete process.env.GROQ_API_KEY; vi.restoreAllMocks(); });
  const pegar = async (err: unknown) => { post.mockRejectedValue(err); try { await new AudioTranscriptionService().execute(arquivo); } catch (e) { return e as LimiteDeTaxaException; } return undefined; };

  it('429 do provedor: HTTP 429 com a mensagem do pedido e sem o corpo do provedor', async () => {
    const erro = await pegar({ message: 'Request failed with status code 429', response: { status: 429, data: { error: { message: 'SIMULADO: limite' } }, headers: {} } });
    expect(erro).toBeInstanceOf(LimiteDeTaxaException);
    expect(erro!.getStatus()).toBe(429);
    expect(erro!.getResponse()).toEqual({ statusCode: 429, message: 'O assistente de IA está com muitas solicitações no momento. Aguarde cerca de um minuto e tente novamente.' });
    expect(JSON.stringify(erro!.getResponse())).not.toContain('SIMULADO');
    expect(erro!.retryAfter).toBeUndefined();
  });

  it('429 com retry-after do provedor: repassa o valor', async () => {
    const erro = await pegar({ message: 'x', response: { status: 429, data: {}, headers: { 'retry-after': '45' } } });
    expect(erro!.retryAfter).toBe('45');
  });
});

// Não prova: transcrição real, formato do áudio do navegador, nem o limite de 25 MB (esse é do multer na rota).
