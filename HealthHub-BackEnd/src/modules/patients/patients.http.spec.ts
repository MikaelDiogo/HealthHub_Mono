// Cadastro mínimo (RF02): só o nome é obrigatório; "Nome desconhecido" gera nome provisório; o nome pode ser corrigido.
// Sobe um app Nest mínimo com o controller real, o ValidationPipe igual ao de produção (main.ts) e o RolesGuard real.
// Autenticação FALSA (perfil no cabeçalho x-role) e repositório EM MEMÓRIA: não usa banco nem rede.
import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanActivate, ExecutionContext, Injectable, Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { PatientsController } from './presentation/patients.controller';
import { CreatePatientService } from './application/create-patient.service';
import { ListPatientsService } from './application/list-patients.service';
import { ShowPatientService } from './application/show-patient.service';
import { UpdatePatientService } from './application/update-patient.service';
import { Paciente } from './domain/paciente.entity';
import { CreateFilaDto } from '../fila/presentation/dtos/create-fila.dto';

@Injectable()
class FakeAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const role = req.headers['x-role'];
    if (role) req.user = { id: 'u-1', nome: 'Usuário Fictício', role };
    return true;
  }
}

// Repositório em memória com a mesma regra do banco: CPF único quando preenchido (código 23505 na colisão)
const tabela = new Map<string, Paciente>();
let filaAtualizadaPeloBanco = 0;
const ultimaCopiaDaFila: { nome?: string; idade?: number | null } = {};
const repo = {
  findByCpf: async (cpf: string) => [...tabela.values()].find((p) => p.cpf === cpf) ?? null,
  findById: async (id: string) => (tabela.get(id) ? ({ ...tabela.get(id) } as Paciente) : null),
  findByIdWithVitals: async (id: string) => tabela.get(id) ?? null,
  findAllWithVitals: async () => [...tabela.values()],
  createAndSave: async (d: Partial<Paciente>) => {
    if (d.cpf && [...tabela.values()].some((p) => p.cpf === d.cpf)) throw Object.assign(new Error('duplicate'), { code: '23505' });
    const p = { ativo: true, nome_provisorio: false, ...d } as Paciente;
    tabela.set(p.id, p);
    return p;
  },
  save: async (p: Paciente) => { tabela.set(p.id, p); return p; },
  saveSincronizandoFila: async (p: Paciente) => {
    tabela.set(p.id, p);
    ultimaCopiaDaFila.nome = p.nome_completo;
    ultimaCopiaDaFila.idade = p.idade ?? null;
    return { paciente: p, filaAtualizada: filaAtualizadaPeloBanco };
  },
  setAtivo: async () => undefined,
};
const gateway = { broadcastFilaChanged: vi.fn() };

const createSvc = new CreatePatientService(repo as any);
const updateSvc = new UpdatePatientService(repo as any, gateway as any);

Reflect.defineMetadata('design:paramtypes', [CreatePatientService, ListPatientsService, ShowPatientService, UpdatePatientService], PatientsController);

@Module({
  controllers: [PatientsController],
  providers: [
    { provide: APP_GUARD, useClass: FakeAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: CreatePatientService, useValue: createSvc },
    { provide: ListPatientsService, useValue: new ListPatientsService(repo as any) },
    { provide: ShowPatientService, useValue: { execute: vi.fn() } },
    { provide: UpdatePatientService, useValue: updateSvc },
  ],
})
class TesteModule {}

let app: INestApplication;
let base: string;
beforeAll(async () => {
  app = await NestFactory.create(TesteModule, { logger: false });
  // Mesmas opções do main.ts: whitelist + transform
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  base = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
});
afterAll(async () => { await app.close(); });
beforeEach(() => { tabela.clear(); filaAtualizadaPeloBanco = 0; gateway.broadcastFilaChanged.mockClear(); });

const chamar = (role: string | null, method: string, path: string, body?: unknown) =>
  fetch(base + path, { method, headers: { ...(role ? { 'x-role': role } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
const cadastrar = (body: unknown, role = 'recepcionista') => chamar(role, 'POST', '/patients', body);

describe('Cadastro mínimo — só o nome é obrigatório', () => {
  it('sem nome: 400', async () => {
    const r = await cadastrar({ cpf: '12345678901', idade: 30, sexo: 'F' });
    expect(r.status).toBe(400);
  });

  it('nome vazio ou só espaços: 400', async () => {
    expect((await cadastrar({ nome_completo: '' })).status).toBe(400);
    expect((await cadastrar({ nome_completo: '   ' })).status).toBe(400);
  });

  it('só com o nome: 201, sem marca de nome provisório e campos ausentes como null', async () => {
    const r = await cadastrar({ nome_completo: 'FICTÍCIO-01' });
    expect(r.status).toBe(201);
    const p = (await r.json()) as Paciente;
    expect(p.nome_completo).toBe('FICTÍCIO-01');
    expect(p.nome_provisorio).toBe(false);
    expect(p.cpf).toBeNull();
  });

  it('nome com 1 caractere também é aceito (sem mínimo de 3)', async () => {
    expect((await cadastrar({ nome_completo: 'Li' })).status).toBe(201);
  });

  it('campos opcionais vazios ("") viram null e nunca bloqueiam', async () => {
    const r = await cadastrar({ nome_completo: 'TESTE A', cpf: '', idade: '', sexo: '', telefone: '', endereco: '', alergias: '', medicamentos_em_uso: '', anamnese: '', rg: '' });
    expect(r.status).toBe(201);
    const p = (await r.json()) as Record<string, unknown>;
    for (const campo of ['cpf', 'idade', 'sexo', 'telefone', 'endereco', 'alergias', 'medicamentos_em_uso', 'anamnese', 'rg']) expect(p[campo]).toBeNull();
  });

  it('dois pacientes sem CPF são permitidos', async () => {
    expect((await cadastrar({ nome_completo: 'TESTE A' })).status).toBe(201);
    expect((await cadastrar({ nome_completo: 'TESTE B' })).status).toBe(201);
    expect(tabela.size).toBe(2);
  });

  it('CPF repetido (preenchido): 400', async () => {
    expect((await cadastrar({ nome_completo: 'TESTE A', cpf: '12345678901' })).status).toBe(201);
    const r = await cadastrar({ nome_completo: 'TESTE B', cpf: '12345678901' });
    expect(r.status).toBe(400);
    expect(JSON.stringify(await r.json())).toContain('CPF');
  });

  it('o formato continua validado quando o campo é preenchido', async () => {
    expect((await cadastrar({ nome_completo: 'TESTE A', cpf: '123' })).status).toBe(400);
    expect((await cadastrar({ nome_completo: 'TESTE A', idade: 'abc' })).status).toBe(400);
    expect((await cadastrar({ nome_completo: 'TESTE A', idade: 200 })).status).toBe(400);
    expect((await cadastrar({ nome_completo: 'TESTE A', sexo: 'X' })).status).toBe(400);
    expect((await cadastrar({ nome_completo: 'TESTE A', telefone: '12' })).status).toBe(400);
  });

  it('sexo M, F e Outro (valor antigo) continuam aceitos', async () => {
    for (const sexo of ['M', 'F', 'Outro']) expect((await cadastrar({ nome_completo: 'TESTE A', sexo })).status).toBe(201);
  });

  it.each(['recepcionista', 'enfermeiro', 'medico'])('perfil %s cadastra: 201', async (role) => {
    expect((await cadastrar({ nome_completo: 'TESTE A' }, role)).status).toBe(201);
  });
});

describe('Nome desconhecido → nome provisório', () => {
  it('grava "Paciente não identificado (#xxxx)" com os 4 primeiros caracteres do id e a marca nome_provisorio', async () => {
    const r = await cadastrar({ nome_desconhecido: true });
    expect(r.status).toBe(201);
    const p = (await r.json()) as Paciente;
    expect(p.nome_provisorio).toBe(true);
    expect(p.nome_completo).toBe(`Paciente não identificado (#${p.id.slice(0, 4)})`);
  });

  it('o nome enviado junto é ignorado', async () => {
    const p = (await (await cadastrar({ nome_desconhecido: true, nome_completo: 'Fulano' })).json()) as Paciente;
    expect(p.nome_completo.startsWith('Paciente não identificado (#')).toBe(true);
  });

  it('nome_desconhecido=false volta a exigir o nome', async () => {
    expect((await cadastrar({ nome_desconhecido: false })).status).toBe(400);
  });
});

describe('Correção do nome (PUT /patients/:id)', () => {
  const criarProvisorio = async () => (await (await cadastrar({ nome_desconhecido: true })).json()) as Paciente;

  it('nome diferente do provisório: a marca some', async () => {
    const p = await criarProvisorio();
    const r = await chamar('enfermeiro', 'PUT', `/patients/${p.id}`, { nome_completo: 'FICTÍCIO-02' });
    expect(r.status).toBe(200);
    const salvo = (await r.json()) as Paciente;
    expect(salvo.nome_completo).toBe('FICTÍCIO-02');
    expect(salvo.nome_provisorio).toBe(false);
  });

  it('editar outro campo mantém a marca e o nome provisório', async () => {
    const p = await criarProvisorio();
    const salvo = (await (await chamar('medico', 'PUT', `/patients/${p.id}`, { idade: 40 })).json()) as Paciente;
    expect(salvo.nome_provisorio).toBe(true);
    expect(salvo.nome_completo).toBe(p.nome_completo);
    expect(salvo.idade).toBe(40);
  });

  it('nome vazio na edição continua recusado (400)', async () => {
    const p = await criarProvisorio();
    expect((await chamar('enfermeiro', 'PUT', `/patients/${p.id}`, { nome_completo: '' })).status).toBe(400);
    expect((await chamar('enfermeiro', 'PUT', `/patients/${p.id}`, { nome_completo: '   ' })).status).toBe(400);
    expect((await chamar('enfermeiro', 'PUT', `/patients/${p.id}`, { nome_completo: null })).status).toBe(400);
    expect(tabela.get(p.id)?.nome_completo).toBe(p.nome_completo);
  });

  it('a recepção continua sem permissão para editar: 403 (permissões inalteradas)', async () => {
    const p = await criarProvisorio();
    expect((await chamar('recepcionista', 'PUT', `/patients/${p.id}`, { nome_completo: 'FICTÍCIO-03' })).status).toBe(403);
  });

  it('médico e enfermeiro editam: 200', async () => {
    const p = await criarProvisorio();
    for (const role of ['medico', 'enfermeiro']) expect((await chamar(role, 'PUT', `/patients/${p.id}`, { alergias: 'Nenhuma' })).status).toBe(200);
  });

  it('paciente na esteira: a cópia de nome e idade é atualizada junto e os clientes são avisados (fila:changed)', async () => {
    const p = await criarProvisorio();
    filaAtualizadaPeloBanco = 1; // o repositório real devolve quantas entradas da esteira atualizou
    const r = await chamar('enfermeiro', 'PUT', `/patients/${p.id}`, { nome_completo: 'FICTÍCIO-04', idade: 52 });
    expect(r.status).toBe(200);
    expect(ultimaCopiaDaFila).toEqual({ nome: 'FICTÍCIO-04', idade: 52 });
    expect(gateway.broadcastFilaChanged).toHaveBeenCalledTimes(1);
  });

  it('paciente fora da esteira: nada para avisar', async () => {
    const p = await criarProvisorio();
    filaAtualizadaPeloBanco = 0;
    await chamar('enfermeiro', 'PUT', `/patients/${p.id}`, { nome_completo: 'FICTÍCIO-05' });
    expect(gateway.broadcastFilaChanged).not.toHaveBeenCalled();
  });

  it('CPF de outro paciente na edição: 400 (não 500)', async () => {
    await cadastrar({ nome_completo: 'TESTE A', cpf: '12345678901' });
    const b = (await (await cadastrar({ nome_completo: 'TESTE B' })).json()) as Paciente;
    tabela.set(b.id, { ...b });
    const original = repo.saveSincronizandoFila;
    repo.saveSincronizandoFila = async () => { throw Object.assign(new Error('duplicate'), { code: '23505' }); };
    try {
      expect((await chamar('medico', 'PUT', `/patients/${b.id}`, { cpf: '12345678901' })).status).toBe(400);
    } finally { repo.saveSincronizandoFila = original; }
  });
});

describe('Admissão de paciente sem idade (cópia na esteira)', () => {
  const validar = async (corpo: object) => validate(plainToInstance(CreateFilaDto, corpo), { whitelist: true });
  const base = { paciente_id: '11111111-1111-4111-8111-111111111111', nome: 'Paciente não identificado (#a1b2)', chegada: '08:00', status: 'Aguardando Triagem' };

  it('idade ausente, vazia ou null é aceita', async () => {
    expect(await validar(base)).toHaveLength(0);
    expect(await validar({ ...base, idade: '' })).toHaveLength(0);
    expect(await validar({ ...base, idade: null })).toHaveLength(0);
  });

  it('idade preenchida continua validada como inteiro', async () => {
    expect(await validar({ ...base, idade: 34 })).toHaveLength(0);
    expect(await validar({ ...base, idade: 'abc' })).not.toHaveLength(0);
  });
});
