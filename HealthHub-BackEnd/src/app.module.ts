import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { buildTypeOrmOptions } from './config/typeorm.config';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import { RolesGuard } from './shared/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { PatientsModule } from './modules/patients/patients.module';
import { SinaisVitaisModule } from './modules/sinais-vitais/sinais-vitais.module';
import { FilaModule } from './modules/fila/fila.module';
import { AiModule } from './modules/ai/ai.module';
import { ChatModule } from './modules/chat/chat.module';
import { VisitasModule } from './modules/visitas/visitas.module';
import { MetricasModule } from './modules/metricas/metricas.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(buildTypeOrmOptions()),
    // JWT global: mesmo secret e expiração do sistema legado
    JwtModule.register({
      global: true,
      secret: process.env.SECRET_KEY,
      signOptions: { expiresIn: '1d' },
    }),
    ThrottlerModule.forRoot([{ ttl: 15 * 60 * 1000, limit: 100 }]),
    AuthModule,
    PatientsModule,
    SinaisVitaisModule,
    FilaModule,
    AiModule,
    ChatModule,
    VisitasModule,
    MetricasModule,
  ],
  providers: [
    // Guards globais: toda rota exige JWT (exceto @Public) e respeita @Roles
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
