import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from '../application/auth.service';
import { LoginDto } from './dtos/login.dto';
import { Public } from '../../../shared/decorators/public.decorator';

const isProduction = process.env.NODE_ENV === 'production';

@ApiTags('Autenticação')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Rate limit: máx 10 tentativas / 15 min por IP em produção */
  @ApiOperation({ summary: "Login (retorna token JWT, perfil e nome)", description: "Rota pública." })
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: isProduction ? 10 : 100, ttl: 15 * 60 * 1000 } })
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginDto) {
    const result = await this.authService.login(body.email, body.password);
    return { auth: true, ...result };
  }
}
