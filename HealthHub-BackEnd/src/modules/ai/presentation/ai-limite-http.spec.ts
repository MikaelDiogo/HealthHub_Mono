// Resposta HTTP do 429 do assistente de IA (chat e áudio): status, corpo e cabeçalho Retry-After. App Nest mínimo com o controller real e o
// filtro real; o provedor de IA é simulado (nenhuma chamada real à Groq). Esperados escritos à mão a partir do pedido da rodada 4.
import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { InternalServerErrorException, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AiController } from './ai.controller';
import { ClinicalChatService } from '../application/clinical-chat.service';
import { AudioTranscriptionService } from '../application/audio-transcription.service';
import { LimiteDeTaxaException } from '../infrastructure/limite-de-taxa';

const MSG = 'O assistente de IA está com muitas solicitações no momento. Aguarde cerca de um minuto e tente novamente.';
const ID = '11111111-1111-4111-8111-111111111111';
const chat = { execute: vi.fn() };
const audio = { execute: vi.fn() };

Reflect.defineMetadata('design:paramtypes', [ClinicalChatService, AudioTranscriptionService], AiController);

@Module({
  controllers: [AiController],
  providers: [{ provide: ClinicalChatService, useValue: chat }, { provide: AudioTranscriptionService, useValue: audio }],
})
class TesteModule {}

let app: INestApplication;
let base: string;
beforeAll(async () => {
  app = await NestFactory.create(TesteModule, { logger: false });
  await app.listen(0, '127.0.0.1');
  base = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
});
afterAll(async () => { await app.close(); });
beforeEach(() => { vi.clearAllMocks(); });

const postChat = () => fetch(`${base}/patients/${ID}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Olá', patientContext: {} }) });
const postAudio = () => {
  const f = new FormData();
  f.append('audio', new Blob([Buffer.from('bytes de teste')], { type: 'audio/webm' }), 'a.webm');
  return fetch(`${base}/patients/${ID}/chat/audio`, { method: 'POST', body: f });
};

describe('429 do provedor de IA na resposta HTTP', () => {
  for (const [nome, chamar, servico] of [['chat', postChat, chat], ['áudio', postAudio, audio]] as const) {
    it(`${nome}: 429 com a mensagem exata e o cabeçalho Retry-After quando o provedor o informou`, async () => {
      servico.execute.mockRejectedValue(new LimiteDeTaxaException('30'));
      const r = await chamar();
      expect(r.status).toBe(429);
      expect(r.headers.get('retry-after')).toBe('30');
      expect(await r.json()).toEqual({ statusCode: 429, message: MSG });
    });
    it(`${nome}: 429 sem retry-after do provedor NÃO traz o cabeçalho Retry-After`, async () => {
      servico.execute.mockRejectedValue(new LimiteDeTaxaException());
      const r = await chamar();
      expect(r.status).toBe(429);
      expect(r.headers.get('retry-after')).toBeNull();
      expect(await r.json()).toEqual({ statusCode: 429, message: MSG });
    });
    it(`${nome}: outra falha do provedor continua HTTP 500 genérico`, async () => {
      servico.execute.mockRejectedValue(new InternalServerErrorException({ error: 'Assistente clínico indisponível.' }));
      const r = await chamar();
      expect(r.status).toBe(500);
      expect(r.headers.get('retry-after')).toBeNull();
      expect(await r.json()).toEqual({ error: 'Assistente clínico indisponível.' });
    });
  }
});
