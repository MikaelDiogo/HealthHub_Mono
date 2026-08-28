import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { IUserRepository, USER_REPOSITORY } from '../domain/user-repository.interface';
import { UserRole } from '../domain/user.entity';

export interface LoginResult {
  token: string;
  role: UserRole;
  nome: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException({ auth: false, message: 'Credenciais inválidas' });
    }

    const senhaValida = await bcrypt.compare(password, user.senha);
    if (!senhaValida) {
      throw new UnauthorizedException({ auth: false, message: 'Credenciais inválidas' });
    }

    const token = this.jwtService.sign({ id: user.id, nome: user.nome, role: user.role });

    return { token, role: user.role, nome: user.nome };
  }
}
