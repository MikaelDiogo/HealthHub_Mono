import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AiController } from './ai.controller';

const ID = '11111111-1111-4111-8111-111111111111';
function montar() {
  const chat = { execute: vi.fn().mockResolvedValue({ reply: 'simulada', source: 'groq' }) };
  const audio = { execute: vi.fn().mockResolvedValue({ transcription: 'simulada' }) };
  return { controller: new AiController(chat as any, audio as any), chat, audio };
}
const audioFile = (size: number) => ({ buffer: Buffer.alloc(size), size, mimetype: 'audio/webm', originalname: 'a.webm' }) as Express.Multer.File;

describe('AiController.chat — entrada inválida vira 400 (não 500)', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([[undefined], [''], ['   '], [123], [null]])('message %j → 400 e o provedor não é chamado', (message) => {
    const { controller, chat } = montar();
    expect(() => controller.chat(ID, { message, patientContext: {} } as any)).toThrow(BadRequestException);
    expect(chat.execute).not.toHaveBeenCalled();
  });

  it('corpo ausente → 400', () => {
    const { controller } = montar();
    expect(() => controller.chat(ID, undefined as any)).toThrow(BadRequestException);
  });

  it('mensagem válida segue para o serviço com o contexto e o histórico recebidos', async () => {
    const { controller, chat } = montar();
    const ctx = { nome: 'TESTE A' };
    await controller.chat(ID, { message: 'Olá', patientContext: ctx, history: [{ role: 'user', content: 'x' }] });
    expect(chat.execute).toHaveBeenCalledWith('Olá', ctx, [{ role: 'user', content: 'x' }]);
  });

  it('patientContext nulo é aceito pelo controller (o provedor trata como vazio)', async () => {
    const { controller, chat } = montar();
    await controller.chat(ID, { message: 'Olá', patientContext: null } as any);
    expect(chat.execute).toHaveBeenCalledTimes(1);
  });
});

describe('AiController.transcribe — áudio ausente ou vazio vira 400', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sem arquivo → 400', () => {
    const { controller, audio } = montar();
    expect(() => controller.transcribe(ID, undefined)).toThrow(BadRequestException);
    expect(audio.execute).not.toHaveBeenCalled();
  });

  it('arquivo de 0 byte → 400 e o provedor não é chamado', () => {
    const { controller, audio } = montar();
    expect(() => controller.transcribe(ID, audioFile(0))).toThrow(BadRequestException);
    expect(audio.execute).not.toHaveBeenCalled();
  });

  it('arquivo com conteúdo segue para a transcrição', async () => {
    const { controller, audio } = montar();
    await controller.transcribe(ID, audioFile(2048));
    expect(audio.execute).toHaveBeenCalledTimes(1);
  });
});

// Não prova: o filtro de MIME e o limite de 25 MB (são do multer, ficam na rota real e foram vistos nos casos
// I03 do mock); nem o contrato HTTP completo (status 201/400 pela rede).
