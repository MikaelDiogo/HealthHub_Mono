// As colunas são `timestamp without time zone` e o Postgres grava os defaults
// (created_at) em UTC. Com o Node no fuso local, a leitura deslocava tudo em 3 h
// (esperas "no futuro", horários adiantados no chat e no gráfico). O processo
// roda em UTC; a exibição em horário de Brasília é feita explicitamente na
// interface e nas métricas (America/Sao_Paulo).
process.env.TZ = 'UTC';

import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded, type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { validateEnv } from './config/env.validation';
import { SWAGGER_PATH, configurarSwagger, swaggerHabilitado } from './config/swagger';

async function bootstrap() {
  // Segurança: boot falha imediatamente se envs obrigatórias ausentes
  validateEnv();

  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Segurança: headers HTTP. A interface do Swagger usa scripts inline, então só ela fica sem CSP.
  const comSwagger = swaggerHabilitado(process.env);
  const helmetPadrao = helmet();
  const helmetDocs = helmet({ contentSecurityPolicy: false });
  app.use((req: Request, res: Response, next: NextFunction) =>
    comSwagger && req.path.startsWith(`/${SWAGGER_PATH}`) ? helmetDocs(req, res, next) : helmetPadrao(req, res, next),
  );

  // Segurança: limite de tamanho de payload (evita DoS)
  app.use(json({ limit: '10kb' }));
  app.use(urlencoded({ limit: '10kb', extended: false }));

  // Segurança: CORS restrito por ambiente
  const allowedOrigins =
    process.env.NODE_ENV === 'production'
      ? (process.env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean)
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:4173'];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  });

  // Validação global: remove campos desconhecidos (paridade com Zod strip) e coage tipos
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  if (comSwagger) configurarSwagger(app);

  const PORT = Number(process.env.PORT) || 3001;
  await app.listen(PORT);
  console.log(`HealthHub API (NestJS) rodando em http://localhost:${PORT}`);
}

bootstrap().catch((error) => {
  console.error('Erro ao iniciar o servidor:', error.message);
  process.exit(1);
});
