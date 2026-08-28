import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const isProduction = process.env.NODE_ENV === 'production';

export function buildTypeOrmOptions(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    // Se houver DATABASE_URL, usa ela. Caso contrário, usa os campos individuais.
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
    synchronize: false, // sempre via migrations
    logging: !isProduction,
    autoLoadEntities: true,
  };
}
