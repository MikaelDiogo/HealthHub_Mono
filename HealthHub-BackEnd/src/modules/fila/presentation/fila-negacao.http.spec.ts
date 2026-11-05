// Mensagem de recusa do PUT /fila/:id (critério S4 do roteiro): a recepção, ao tentar gravar a cor da classificação de risco,
// recebe a mensagem específica do documento; sem o campo `gravidade` continua a mensagem genérica. O status é SEMPRE 403 e a lista
// de perfis da rota não mudou. App Nest mínimo com o controller real, o RolesGuard real e um guard de autenticação FALSO (x-role).
import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanActivate, ExecutionContext, Injectable, Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { FilaController } from './fila.controller';
import { CreateFilaService } from '../application/create-fila.service';
import { ListFilaService } from '../application/list-fila.service';
import { UpdateFilaService } from '../application/update-fila.service';
import { DeleteFilaService } from '../application/delete-fila.service';
import { DischargeFilaService } from '../application/discharge-fila.service';

@Injectable()
class FakeAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const role = req.headers['x-role'];
    if (role) req.user = { id: 'u-1', nome: 'Usuário Fictício', role };
    return true;
  }
}

const ID = '11111111-1111-4111-8111-111111111111';
const MSG_COR = 'Apenas o enfermeiro pode atribuir a categoria de risco.';
const update = { execute: vi.fn() };

Reflect.defineMetadata('design:paramtypes', [CreateFilaService, ListFilaService, UpdateFilaService, DeleteFilaService, DischargeFilaService], FilaController);

@Module({
  controllers: [FilaController],
  providers: [
    { provide: APP_GUARD, useClass: FakeAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: CreateFilaService, useValue: { execute: vi.fn() } },
    { provide: ListFilaService, useValue: { execute: vi.fn() } },
    { provide: UpdateFilaService, useValue: update },
    { provide: DeleteFilaService, useValue: { execute: vi.fn() } },
    { provide: DischargeFilaService, useValue: { execute: vi.fn() } },
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

const put = (role: string | null, body: unknown) =>
  fetch(`${base}/fila/${ID}`, { method: 'PUT', headers: { ...(role ? { 'x-role': role } : {}), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

describe('PUT /fila/:id: mensagem de recusa para a recepção', () => {
  it('recepção tentando gravar a cor: 403 com a mensagem do documento e o serviço NÃO é chamado', async () => {
    const r = await put('recepcionista', { gravidade: 'Vermelho' });
    expect(r.status).toBe(403);
    expect(JSON.stringify(await r.json())).toContain(MSG_COR);
    expect(update.execute).not.toHaveBeenCalled();
  });
  it('recepção sem o campo gravidade (ex.: mudar etapa): 403 com a mensagem genérica, como antes', async () => {
    const r = await put('recepcionista', { status: 'Em Consulta (Médico)' });
    expect(r.status).toBe(403);
    const corpo = JSON.stringify(await r.json());
    expect(corpo).toContain('Acesso negado para este perfil');
    expect(corpo).not.toContain(MSG_COR);
    expect(update.execute).not.toHaveBeenCalled();
  });
  it('médico e enfermeiro continuam passando pelo guard (o serviço decide)', async () => {
    update.execute.mockResolvedValue({ id: ID });
    expect((await put('enfermeiro', { status: 'Aguardando Atendimento', gravidade: 'Verde' })).status).toBe(200);
    expect((await put('medico', { status: 'Em Observação' })).status).toBe(200);
    expect(update.execute).toHaveBeenCalledTimes(2);
  });
  it('sem login: 401', async () => {
    expect((await put(null, { gravidade: 'Verde' })).status).toBe(401);
  });
});
