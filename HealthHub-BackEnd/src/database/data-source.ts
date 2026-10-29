import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';

import { Paciente } from '../modules/patients/domain/paciente.entity';
import { SinaisVitais } from '../modules/sinais-vitais/domain/sinais-vitais.entity';
import { FilaPaciente } from '../modules/fila/domain/fila-paciente.entity';
import { User } from '../modules/auth/domain/user.entity';
import { Conversation } from '../modules/chat/domain/conversation.entity';
import { ConversationParticipant } from '../modules/chat/domain/conversation-participant.entity';
import { Message } from '../modules/chat/domain/message.entity';
import { Visita } from '../modules/visitas/domain/visita.entity';

// Usado apenas pela CLI do TypeORM (migrations) e pelo seed.
// A aplicação NestJS usa src/config/typeorm.config.ts.
export const AppDataSource = new DataSource({
  type: 'postgres',
  ...(process.env.DATABASE_URL
    ? {
        url: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        extra: { ssl: { rejectUnauthorized: false } },
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'postgres',
        ssl: false,
      }),
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  entities: [Paciente, SinaisVitais, FilaPaciente, User, Conversation, ConversationParticipant, Message, Visita],
  migrations: ['src/database/migrations/*.{ts,js}'],
  subscribers: [],
});
