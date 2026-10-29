import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { ROLES_KEY } from '../../../shared/decorators/roles.decorator';
import { VisitasController } from './visitas.controller';

const roles = (metodo: 'listByPatient' | 'close') => Reflect.getMetadata(ROLES_KEY, VisitasController.prototype[metodo]);

describe('VisitasController — permissões por perfil', () => {
  it('fechar visita manualmente (PATCH patients/:id/visitas/fechar) é só do médico', () => {
    expect(roles('close')).toEqual(['medico']);
  });

  it('o histórico (GET patients/:id/visitas) continua SEM restrição de perfil: decisão pendente (B1b)', () => {
    // Registra o estado atual de propósito. Restringir quebraria o histórico no modal de readmissão da recepção.
    expect(roles('listByPatient')).toBeUndefined();
  });
});

// Não prova: que o RolesGuard global barra a rota (testado à parte); nem quem DEVERIA ler o histórico
// (decisão do autor e do orientador).
