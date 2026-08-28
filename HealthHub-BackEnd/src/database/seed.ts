import 'reflect-metadata';
import 'dotenv/config';
import { AppDataSource } from './data-source';
import { User } from '../modules/auth/domain/user.entity';
import * as bcrypt from 'bcryptjs';

// Senhas lidas de variáveis de ambiente — nunca hardcoded
const SEED_USERS = [
  {
    nome: 'Dr. João Silva',
    email: process.env.SEED_MEDICO_EMAIL ?? 'medico@healthhub.com',
    senha: process.env.SEED_MEDICO_SENHA,
    role: 'medico' as const,
  },
  {
    nome: 'Ana Souza',
    email: process.env.SEED_RECEPCIONISTA_EMAIL ?? 'recepcionista@healthhub.com',
    senha: process.env.SEED_RECEPCIONISTA_SENHA,
    role: 'recepcionista' as const,
  },
  {
    nome: 'Mikael Diogo',
    email: process.env.SEED_ENFERMEIRO_EMAIL ?? 'enfermeiro@healthhub.com',
    senha: process.env.SEED_ENFERMEIRO_SENHA,
    role: 'enfermeiro' as const,
  },
];

async function seed() {
  const missing = SEED_USERS.filter((u) => !u.senha).map((u) => u.role);
  if (missing.length > 0) {
    console.error(`Erro: variáveis de ambiente de senha faltando para: ${missing.join(', ')}`);
    console.error('Defina SEED_MEDICO_SENHA, SEED_RECEPCIONISTA_SENHA e SEED_ENFERMEIRO_SENHA no .env');
    process.exit(1);
  }

  await AppDataSource.initialize();
  const userRepo = AppDataSource.getRepository(User);

  for (const u of SEED_USERS) {
    const exists = await userRepo.findOne({ where: { email: u.email } });
    if (!exists) {
      const hash = await bcrypt.hash(u.senha as string, 12);
      await userRepo.save(userRepo.create({ nome: u.nome, email: u.email, senha: hash, role: u.role }));
      console.log(`Criado: ${u.email} (${u.role})`);
    } else {
      console.log(`Já existe: ${u.email}`);
    }
  }

  await AppDataSource.destroy();
  console.log('Seed concluído.');
}

seed().catch(console.error);
