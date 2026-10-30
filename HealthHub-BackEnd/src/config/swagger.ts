import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'api/docs';

// Em produção a documentação fica desligada, a menos que SWAGGER_ENABLED=true seja definido de propósito.
export function swaggerHabilitado(env: Record<string, string | undefined>): boolean {
  if (env.SWAGGER_ENABLED === 'true') return true;
  if (env.SWAGGER_ENABLED === 'false') return false;
  return env.NODE_ENV !== 'production';
}

export function configurarSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('HealthHub API')
    .setDescription(
      'API do HealthHub (MVP acadêmico de triagem e esteira de cuidado). A cor de risco é escolhida manualmente pelo enfermeiro; ' +
        'o sistema não classifica, não sugere prioridade e não controla prazos. A classificação de risco é registrada manualmente pelo enfermeiro, conforme as diretrizes de acolhimento com classificação de risco do Ministério da Saúde. ' +
        'Perfis: recepcionista, enfermeiro, medico. Faça login em POST /login e use o token em "Authorize".',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document, { jsonDocumentUrl: `${SWAGGER_PATH}-json` });
}
