const REQUIRED_ENVS = ['SECRET_KEY'] as const;

const DB_ENVS_HINT =
  'Defina DATABASE_URL ou os campos DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME no .env';

export function validateEnv(): void {
  const missing = REQUIRED_ENVS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}. O servidor não pode iniciar.`,
    );
  }

  if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
    console.warn(`[env] Nenhuma configuração de banco encontrada. ${DB_ENVS_HINT}`);
  }

  if (!process.env.GROQ_API_KEY) {
    console.warn('[env] GROQ_API_KEY ausente — assistente clínico de IA ficará indisponível (503).');
  }
}
