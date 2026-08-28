import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/auth/domain/user.entity';

export const ROLES_KEY = 'roles';

/** Restringe a rota aos perfis informados. Uso: @Roles('medico', 'enfermeiro') */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
