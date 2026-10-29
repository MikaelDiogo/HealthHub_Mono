import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { RequestMethod } from '@nestjs/common';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { AiController } from '../modules/ai/presentation/ai.controller';
import { AuthController } from '../modules/auth/presentation/auth.controller';
import { ChatController } from '../modules/chat/presentation/chat.controller';
import { EventosController } from '../modules/eventos/presentation/eventos.controller';
import { FilaController } from '../modules/fila/presentation/fila.controller';
import { MetricasController } from '../modules/metricas/presentation/metricas.controller';
import { PatientsController } from '../modules/patients/presentation/patients.controller';
import { SinaisVitaisController } from '../modules/sinais-vitais/presentation/sinais-vitais.controller';
import { VisitasController } from '../modules/visitas/presentation/visitas.controller';
import { swaggerHabilitado } from './swagger';

const CONTROLLERS: any[] = [AiController, AuthController, ChatController, EventosController, FilaController, MetricasController, PatientsController, SinaisVitaisController, VisitasController];

describe('Swagger — cobertura da documentação', () => {
  it.each(CONTROLLERS.map((c) => [c.name, c]))('%s tem tag e todas as rotas têm resumo', (_nome, ctrl) => {
    expect(Reflect.getMetadata(DECORATORS.API_TAGS, ctrl), 'ApiTags').toBeTruthy();
    const rotas = Object.getOwnPropertyNames(ctrl.prototype).filter(
      (m) => m !== 'constructor' && Reflect.getMetadata('method', ctrl.prototype[m]) !== undefined,
    );
    expect(rotas.length).toBeGreaterThan(0);
    for (const m of rotas) {
      const op = Reflect.getMetadata(DECORATORS.API_OPERATION, ctrl.prototype[m]);
      expect(op?.summary, `${ctrl.name}.${m} sem @ApiOperation`).toBeTruthy();
    }
  });

  it('rotas autenticadas declaram Bearer e o login não', () => {
    for (const c of CONTROLLERS.filter((x) => x !== AuthController)) {
      expect(Reflect.getMetadata(DECORATORS.API_SECURITY, c), c.name).toBeTruthy();
    }
    expect(Reflect.getMetadata(DECORATORS.API_SECURITY, AuthController)).toBeUndefined();
  });

  it('a rota nova de eventos descreve os perfis permitidos', () => {
    const op = Reflect.getMetadata(DECORATORS.API_OPERATION, EventosController.prototype.listar);
    expect(op.description).toMatch(/medico/);
    expect(op.description).toMatch(/enfermeiro/);
    expect(RequestMethod[Reflect.getMetadata('method', EventosController.prototype.listar)]).toBe('GET');
  });
});

describe('swaggerHabilitado', () => {
  it('fica ligado em desenvolvimento e desligado em produção', () => {
    expect(swaggerHabilitado({ NODE_ENV: 'development' })).toBe(true);
    expect(swaggerHabilitado({})).toBe(true);
    expect(swaggerHabilitado({ NODE_ENV: 'production' })).toBe(false);
  });
  it('em produção só liga com SWAGGER_ENABLED=true explícito', () => {
    expect(swaggerHabilitado({ NODE_ENV: 'production', SWAGGER_ENABLED: 'true' })).toBe(true);
    expect(swaggerHabilitado({ NODE_ENV: 'production', SWAGGER_ENABLED: '1' })).toBe(false);
  });
  it('SWAGGER_ENABLED=false desliga também em desenvolvimento', () => {
    expect(swaggerHabilitado({ NODE_ENV: 'development', SWAGGER_ENABLED: 'false' })).toBe(false);
  });
});

// Não prova: que o documento gerado reflita cada corpo/resposta com exatidão (isso é conferido
// subindo a API e lendo /api/docs-json), nem que a rota esteja protegida em produção.
