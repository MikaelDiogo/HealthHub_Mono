import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { NEGACAO_POR_CAMPO_KEY, ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../modules/auth/domain/user.entity';
import { JwtPayload } from './jwt-auth.guard';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();

    if (!request.user) {
      throw new UnauthorizedException({ message: 'Não autenticado' });
    }
    if (!requiredRoles.includes(request.user.role as UserRole)) {
      // Se a rota declarou um campo sensível e o corpo o traz, a recusa diz o motivo (mesmo 403, mesma lista de perfis).
      const negacao = this.reflector.get<{ campo: string; mensagem: string } | undefined>(NEGACAO_POR_CAMPO_KEY, context.getHandler());
      const corpo = request.body as Record<string, unknown> | undefined;
      if (negacao && corpo && corpo[negacao.campo] !== undefined) {
        throw new ForbiddenException({ error: negacao.mensagem });
      }
      throw new ForbiddenException({ message: 'Acesso negado para este perfil' });
    }
    return true;
  }
}
