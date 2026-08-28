import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { validateEnv } from './config/env.validation';

async function bootstrap() {
  // Segurança: boot falha imediatamente se envs obrigatórias ausentes
  validateEnv();

  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Segurança: headers HTTP
  app.use(helmet());

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

  const PORT = Number(process.env.PORT) || 3001;
  await app.listen(PORT);
  console.log(`HealthHub API (NestJS) rodando em http://localhost:${PORT}`);
}

bootstrap().catch((error) => {
  console.error('Erro ao iniciar o servidor:', error.message);
  process.exit(1);
});
