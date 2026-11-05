import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/auth/domain/user.entity';

export const ROLES_KEY = 'roles';

/** Restringe a rota aos perfis informados. Uso: @Roles('medico', 'enfermeiro') */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const NEGACAO_POR_CAMPO_KEY = 'negacao_por_campo';

/**
 * Mensagem específica para quem é barrado pelo @Roles quando o corpo traz um campo sensível.
 * Uso: @NegacaoPorCampo('gravidade', 'Apenas o enfermeiro pode atribuir a categoria de risco.')
 * A recusa (403) e a lista de perfis NÃO mudam: só o texto da resposta, que passa a dizer o motivo.
 */
export const NegacaoPorCampo = (campo: string, mensagem: string) => SetMetadata(NEGACAO_POR_CAMPO_KEY, { campo, mensagem });
