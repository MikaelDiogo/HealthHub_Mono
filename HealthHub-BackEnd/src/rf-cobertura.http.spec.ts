// Testes HTTP dos RF antes sem cobertura (RF07, RF15, RF16, RF17). Sobem um app Nest mínimo com os controllers reais,
// o RolesGuard real e um guard de autenticação FALSO (lê o perfil do cabeçalho x-role). Provedores externos são simulados.
// Não usam banco nem rede externa. Numeração dos RF = a do TCC (Seção 4.1.1).
import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanActivate, ExecutionContext, Injectable, Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { RolesGuard } from './shared/guards/roles.guard';
import { SinaisVitaisController } from './modules/sinais-vitais/presentation/sinais-vitais.controller';
import { GetCurrentVitalsService } from './modules/sinais-vitais/application/get-current-vitals.service';
import { GetVitalsHistoryService } from './modules/sinais-vitais/application/get-vitals-history.service';
import { CreateSinaisVitaisService } from './modules/sinais-vitais/application/create-sinais-vitais.service';
import { VisitasController } from './modules/visitas/presentation/visitas.controller';
import { CloseVisitaService } from './modules/visitas/application/close-visita.service';
import { ListVisitasByPatientService } from './modules/visitas/application/list-visitas-by-patient.service';
import { AiController } from './modules/ai/presentation/ai.controller';
import { ClinicalChatService } from './modules/ai/application/clinical-chat.service';
import { AudioTranscriptionService } from './modules/ai/application/audio-transcription.service';

@Injectable()
class FakeAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const role = req.headers['x-role'];
    if (role) req.user = { id: 'u-1', nome: 'Usuário Fictício', role };
    return true;
  }
}

const PID = '11111111-1111-4111-8111-111111111111';
const medicoVisita = () => ({ id: 'v-1', paciente_id: PID, desfecho: 'Em Atendimento', alta: undefined as Date | undefined, classificacao_risco: undefined as string | undefined });

const patientsRepo = { findById: vi.fn() };
const sinaisRepo = { findLatestByPatient: vi.fn(), findAllByPatient: vi.fn(), createAndSave: vi.fn() };
const visitasRepo = { findActiveByPacienteId: vi.fn(), save: vi.fn(), create: vi.fn(), findAllByPacienteId: vi.fn() };
const provider = { execute: vi.fn() };
const transcricao = { execute: vi.fn() };

const getCurrent = new GetCurrentVitalsService(sinaisRepo as any, patientsRepo as any);
const getHistory = new GetVitalsHistoryService(sinaisRepo as any);
const closeVisita = new CloseVisitaService(visitasRepo as any);
const chat = new ClinicalChatService(provider as any);

// design:paramtypes não é emitido pelo esbuild (Vitest): declarado à mão para a injeção por tipo dos controllers
Reflect.defineMetadata('design:paramtypes', [CreateSinaisVitaisService, GetVitalsHistoryService, GetCurrentVitalsService], SinaisVitaisController);
Reflect.defineMetadata('design:paramtypes', [ListVisitasByPatientService, CloseVisitaService], VisitasController);
Reflect.defineMetadata('design:paramtypes', [ClinicalChatService, AudioTranscriptionService], AiController);

@Module({
  controllers: [SinaisVitaisController, VisitasController, AiController],
  providers: [
    { provide: APP_GUARD, useClass: FakeAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: CreateSinaisVitaisService, useValue: { execute: vi.fn() } },
    { provide: GetVitalsHistoryService, useValue: getHistory },
    { provide: GetCurrentVitalsService, useValue: getCurrent },
    { provide: ListVisitasByPatientService, useValue: { execute: vi.fn() } },
    { provide: CloseVisitaService, useValue: closeVisita },
    { provide: ClinicalChatService, useValue: chat },
    { provide: AudioTranscriptionService, useValue: transcricao },
  ],
})
class TesteModule {}

let app: INestApplication;
let base: string;
beforeAll(async () => {
  app = await NestFactory.create(TesteModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  base = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
});
afterAll(async () => { await app.close(); });
beforeEach(() => { vi.clearAllMocks(); });

const chamar = (role: string | null, method: string, path: string, body?: unknown) =>
  fetch(base + path, { method, headers: { ...(role ? { 'x-role': role } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });

describe('RF07 — histórico de sinais vitais (últimas 12 medições)', () => {
  it('a rota do dashboard pede as 12 últimas e devolve na ordem do repositório (mais recente primeiro)', async () => {
    patientsRepo.findById.mockResolvedValue({ id: PID });
    const doze = Array.from({ length: 12 }, (_, i) => ({ id: `sv-${12 - i}`, hora: 1200 - i }));
    sinaisRepo.findLatestByPatient.mockResolvedValue(doze);
    const r = await chamar('medico', 'GET', `/patients/${PID}/vitals`);
    expect(r.status).toBe(200);
    expect(sinaisRepo.findLatestByPatient).toHaveBeenCalledWith(PID, 12);
    const corpo = (await r.json()) as Array<{ id: string }>;
    expect(corpo).toHaveLength(12);
    expect(corpo.map((x) => x.id)).toEqual(doze.map((x) => x.id));
  });

  it('paciente inexistente: 400', async () => {
    patientsRepo.findById.mockResolvedValue(null);
    expect((await chamar('enfermeiro', 'GET', `/patients/${PID}/vitals`)).status).toBe(400);
  });

  it.each([['medico', 200], ['enfermeiro', 200], ['recepcionista', 403]])('perfil %s → %i', async (role, esperado) => {
    patientsRepo.findById.mockResolvedValue({ id: PID });
    sinaisRepo.findLatestByPatient.mockResolvedValue([]);
    sinaisRepo.findAllByPatient.mockResolvedValue([]);
    expect((await chamar(role, 'GET', `/patients/${PID}/vitals`)).status).toBe(esperado);
    expect((await chamar(role, 'GET', `/sinais/${PID}/vitals`)).status).toBe(esperado);
  });

  it('sem autenticação: 401', async () => {
    expect((await chamar(null, 'GET', `/patients/${PID}/vitals`)).status).toBe(401);
  });
});

describe('RF15 — fechar a visita com desfecho manual (PATCH /patients/:id/visitas/fechar)', () => {
  it.each(['Alta', 'Internacao', 'Transferencia', 'Saida Voluntaria'])('médico fecha com desfecho "%s": visita com data de alta e desfecho gravado', async (desfecho) => {
    const v = medicoVisita();
    visitasRepo.findActiveByPacienteId.mockResolvedValue(v);
    visitasRepo.save.mockImplementation(async (x) => x);
    const r = await chamar('medico', 'PATCH', `/patients/${PID}/visitas/fechar`, { desfecho });
    expect(r.status).toBe(200);
    const salvo = visitasRepo.save.mock.calls[0][0];
    expect(salvo.desfecho).toBe(desfecho);
    expect(salvo.alta).toBeInstanceOf(Date);
  });

  it('sem desfecho informado, o padrão é "Alta"', async () => {
    visitasRepo.findActiveByPacienteId.mockResolvedValue(medicoVisita());
    visitasRepo.save.mockImplementation(async (x) => x);
    await chamar('medico', 'PATCH', `/patients/${PID}/visitas/fechar`, {});
    expect(visitasRepo.save.mock.calls[0][0].desfecho).toBe('Alta');
  });

  it.each(['enfermeiro', 'recepcionista'])('perfil %s recebe 403 e nada é gravado', async (role) => {
    visitasRepo.findActiveByPacienteId.mockResolvedValue(medicoVisita());
    const r = await chamar(role, 'PATCH', `/patients/${PID}/visitas/fechar`, { desfecho: 'Alta' });
    expect(r.status).toBe(403);
    expect(visitasRepo.save).not.toHaveBeenCalled();
  });

  it('desfecho fora da lista é recusado (400) e nada é gravado', async () => {
    const r = await chamar('medico', 'PATCH', `/patients/${PID}/visitas/fechar`, { desfecho: 'Fugiu' });
    expect(r.status).toBe(400);
    expect(visitasRepo.save).not.toHaveBeenCalled();
  });

  it('sem visita aberta: nada é gravado', async () => {
    visitasRepo.findActiveByPacienteId.mockResolvedValue(null);
    await chamar('medico', 'PATCH', `/patients/${PID}/visitas/fechar`, { desfecho: 'Alta' });
    expect(visitasRepo.save).not.toHaveBeenCalled();
  });
});

describe('RF16 — assistente de IA (POST /patients/:id/chat) com provedor simulado', () => {
  const corpoChat = (extra: object = {}) => ({ message: 'Pergunta fictícia', patientContext: { alergias: 'Dipirona (fictício)' }, history: [], ...extra });

  it('médico e enfermeiro recebem a resposta; o contexto e a pergunta chegam ao provedor', async () => {
    provider.execute.mockResolvedValue({ reply: 'resposta simulada', source: 'groq' });
    for (const role of ['medico', 'enfermeiro']) {
      const r = await chamar(role, 'POST', `/patients/${PID}/chat`, corpoChat());
      expect(r.status).toBe(201);
      expect(((await r.json()) as { reply: string }).reply).toBe('resposta simulada');
    }
    const [msg, ctx] = provider.execute.mock.calls[0];
    expect(msg).toBe('Pergunta fictícia');
    expect(ctx.alergias).toBe('Dipirona (fictício)');
  });

  it('recepcionista: 403 e o provedor não é chamado', async () => {
    const r = await chamar('recepcionista', 'POST', `/patients/${PID}/chat`, corpoChat());
    expect(r.status).toBe(403);
    expect(provider.execute).not.toHaveBeenCalled();
  });

  it('pergunta vazia: 400', async () => {
    expect((await chamar('medico', 'POST', `/patients/${PID}/chat`, corpoChat({ message: '   ' }))).status).toBe(400);
  });

  it('o nome enviado pelo cliente não chega ao provedor (Tarefa 2)', async () => {
    provider.execute.mockResolvedValue({ reply: 'ok', source: 'groq' });
    await chamar('medico', 'POST', `/patients/${PID}/chat`, corpoChat({ patientContext: { nome: 'NOME-FICTICIO', alergias: 'x' } }));
    expect(JSON.stringify(provider.execute.mock.calls[0][1])).not.toContain('NOME-FICTICIO');
  });

  // Achado: o limite de 4 mensagens de histórico é aplicado SÓ no frontend (Monitoring/index.tsx, messages.slice(-4)).
  // O backend repassa o histórico recebido. O teste documenta o comportamento real; não é uma garantia de limite.
  it('DOCUMENTA: o backend NÃO limita o histórico (repassa as 12 mensagens recebidas)', async () => {
    provider.execute.mockResolvedValue({ reply: 'ok', source: 'groq' });
    const hist = Array.from({ length: 12 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` }));
    await chamar('medico', 'POST', `/patients/${PID}/chat`, corpoChat({ history: hist }));
    expect(provider.execute.mock.calls[0][2]).toHaveLength(12);
  });
});

describe('RF17 — transcrição de áudio (POST /patients/:id/chat/audio) com transcrição simulada', () => {
  const enviar = (role: string, bytes: number, tipo = 'audio/webm') => {
    const fd = new FormData();
    fd.append('audio', new Blob([new Uint8Array(bytes)], { type: tipo }), 'ditado.webm');
    return fetch(`${base}/patients/${PID}/chat/audio`, { method: 'POST', headers: { 'x-role': role }, body: fd });
  };

  it('devolve o texto transcrito; o arquivo chega em memória (buffer), sem caminho em disco', async () => {
    transcricao.execute.mockResolvedValue({ transcription: 'texto simulado' });
    const r = await enviar('medico', 2048);
    expect(r.status).toBe(201);
    expect(((await r.json()) as { transcription: string }).transcription).toBe('texto simulado');
    const arquivo = transcricao.execute.mock.calls[0][0];
    expect(Buffer.isBuffer(arquivo.buffer)).toBe(true);
    expect(arquivo.buffer.length).toBe(2048);
    expect(arquivo.path).toBeUndefined();
    expect(arquivo.destination).toBeUndefined();
  });

  // Achado: o limite do Multer (fileSize: 25 * 1024 * 1024) já recusa um arquivo de EXATAMENTE 25 MiB; o efetivo é "abaixo de 25 MiB".
  it('aceita 25 MiB menos 1 byte e recusa a partir de 25 MiB (413), sem chamar a transcrição', async () => {
    const LIMITE = 25 * 1024 * 1024;
    transcricao.execute.mockResolvedValue({ transcription: 'ok' });
    expect((await enviar('enfermeiro', LIMITE - 1)).status).toBe(201);
    transcricao.execute.mockClear();
    const r = await enviar('enfermeiro', LIMITE);
    expect(r.status).toBe(413);
    expect(transcricao.execute).not.toHaveBeenCalled();
  });

  it('arquivo que não é áudio: 400', async () => {
    const r = await enviar('medico', 100, 'application/pdf');
    expect(r.status).toBe(400);
    expect(transcricao.execute).not.toHaveBeenCalled();
  });

  it('recepcionista: 403', async () => {
    expect((await enviar('recepcionista', 100)).status).toBe(403);
    expect(transcricao.execute).not.toHaveBeenCalled();
  });

  it('sem arquivo: 400', async () => {
    const r = await fetch(`${base}/patients/${PID}/chat/audio`, { method: 'POST', headers: { 'x-role': 'medico', 'Content-Type': 'multipart/form-data; boundary=x' }, body: '--x--\r\n' });
    expect(r.status).toBe(400);
  });
});
