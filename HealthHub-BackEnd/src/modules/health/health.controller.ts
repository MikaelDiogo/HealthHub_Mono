import { Controller, Get, HttpCode, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Public } from '../../shared/decorators/public.decorator';

// Verificação de saúde para monitoramento/disponibilidade (RNF de disponibilidade). Sem autenticação e sem expor dados:
// responde só se o processo e o banco estão de pé. Não aceita parâmetros.
@ApiTags('Saúde')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @ApiOperation({ summary: 'Verifica se a API e o banco de dados respondem', description: 'Rota pública. 200 quando o banco responde a uma consulta simples; 503 caso contrário.' })
  @ApiResponse({ status: 200, description: 'API e banco de dados no ar: { status: "ok", database: "up" }' })
  @ApiResponse({ status: 503, description: 'Banco de dados indisponível: { status: "error", database: "down" }' })
  @Public()
  @Get()
  @HttpCode(200)
  async check() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'down' });
    }
    return { status: 'ok', database: 'up' };
  }
}
