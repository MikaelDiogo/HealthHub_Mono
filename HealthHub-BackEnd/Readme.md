# HealthHub — Backend

API REST + WebSocket do sistema de gestão hospitalar com triagem inteligente.

**Stack:** NestJS 10 · TypeORM 0.3 · PostgreSQL 16 · Socket.IO 4 · Groq API

---

## Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 22.12 ou superior (testado em 24.20.0; piso pelo `engines` do Vitest 5) |
| Docker + Docker Compose | qualquer atual |
| npm | 10 |

---

## Configuração do ambiente

### 1. Copiar e preencher o `.env`

```bash
cp .env.example .env
```

Edite `.env` com os seguintes valores obrigatórios:

```env
# Obrigatório — o servidor não sobe sem esta variável
SECRET_KEY=<gere com o comando abaixo>

# Banco de dados — escolha UMA das formas:
# Forma A: string de conexão única (Supabase, Railway, Render…)
DATABASE_URL=postgresql://usuario:senha@host:5432/healthhub

# Forma B: campos individuais (Docker local — padrão do projeto)
DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASS=healthhub2026
DB_NAME=healthhub

# IA — sem esta chave as rotas de chat clínico e áudio retornam 503
GROQ_API_KEY=<sua chave em console.groq.com>

# Porta da API (opcional, padrão 3001)
PORT=3001

# Senhas para o seed (apenas desenvolvimento)
SEED_MEDICO_EMAIL=medico@healthhub.com
SEED_MEDICO_SENHA=<senha forte>
SEED_RECEPCIONISTA_EMAIL=recepcionista@healthhub.com
SEED_RECEPCIONISTA_SENHA=<senha forte>
SEED_ENFERMEIRO_EMAIL=enfermeiro@healthhub.com
SEED_ENFERMEIRO_SENHA=<senha forte>
```

Gerar `SECRET_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Banco de dados com Docker

O projeto inclui um `docker-compose.yml` que sobe o PostgreSQL 16 na porta **5433** (mapeada para 5432 dentro do container).

### Subir o banco

```bash
docker compose up -d
```

### Verificar se está rodando

```bash
docker compose ps
# ou
docker logs healthhub-db
```

### Parar (mantém os dados no volume)

```bash
docker compose stop
```

### Destruir tudo (apaga o volume com os dados)

```bash
docker compose down -v
```

### Acessar o banco diretamente (psql)

```bash
docker exec -it healthhub-db psql -U postgres -d healthhub
```

### Conexão via GUI (TablePlus, DBeaver, pgAdmin)

| Campo | Valor |
|---|---|
| Host | `localhost` |
| Port | `5433` |
| User | `postgres` |
| Password | `healthhub2026` |
| Database | `healthhub` |

---

## Instalação e execução

```bash
# 1. Instalar dependências
npm install

# 2. Subir o banco (se ainda não estiver rodando)
docker compose up -d

# 3. Rodar as migrations (cria todas as tabelas)
npm run migration:run

# 4. Criar os usuários de desenvolvimento (requer SEED_*_SENHA no .env)
npm run seed

# 5. Iniciar em modo desenvolvimento (hot-reload)
npm run dev
```

A API estará disponível em **http://localhost:3001**

---

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia com hot-reload (`nest start --watch`) |
| `npm run build` | Compila para `dist/` |
| `npm run start:prod` | Executa o build compilado |
| `npm run migration:run` | Aplica todas as migrations pendentes |
| `npm run migration:generate` | Gera nova migration a partir das entidades |
| `npm run migration:revert` | Reverte a última migration |
| `npm run seed` | Cria os três usuários de desenvolvimento |

---

## Documentação da API (Swagger)

Com a API rodando, abra `http://localhost:3001/api/docs` (JSON em `/api/docs-json`). A interface lista todas as rotas, os corpos esperados (gerados a partir dos DTOs) e os perfis permitidos em cada uma. Para testar rotas protegidas: faça `POST /login`, copie o `token` e use **Authorize**.

- Ligado por padrão fora de produção; em produção fica **desligado** (404), a menos que `SWAGGER_ENABLED=true` seja definido de propósito. `SWAGGER_ENABLED=false` desliga em qualquer ambiente.
- A documentação descreve o que o código faz hoje; não é validação clínica. A cor de risco é escolhida manualmente e o sistema não implementa o Protocolo de Manchester.

## Módulos e rotas principais

| Módulo | Rotas | Papéis |
|---|---|---|
| `auth` | `POST /login` | público |
| `patients` | `GET/POST /patients` · `GET/PUT /patients/:id` | todos / médico+enfermeiro |
| `sinais-vitais` | `POST /sinais/:id` · `GET /patients/:id/vitals` | médico, enfermeiro |
| `fila` | `GET/POST /fila` · `PUT/DELETE /fila/:id` | todos / médico+enfermeiro / médico |
| `visitas` | `GET /patients/:id/visitas` · `PATCH /patients/:id/visitas/fechar` | autenticado |
| `ai` | `POST /patients/:id/chat` · `POST /patients/:id/chat/audio` | médico, enfermeiro |
| `chat` | `GET/POST /chat/conversations` · WebSocket | autenticado |

---

## Usuários criados pelo seed

| E-mail | Papel |
|---|---|
| `medico@healthhub.com` | `medico` |
| `recepcionista@healthhub.com` | `recepcionista` |
| `enfermeiro@healthhub.com` | `enfermeiro` |

Senhas definidas pelas variáveis `SEED_*_SENHA` no `.env`.

---

## Arquitetura

```
src/
  config/          # typeorm.config.ts · env.validation.ts
  database/
    migrations/    # 6 migrations versionadas
    seed.ts
  modules/
    auth/          # login · JWT
    patients/      # CRUD de prontuário
    sinais-vitais/ # medições seriadas
    fila/          # esteira de cuidado (Kanban)
    visitas/       # episódios de atendimento
    ai/            # Groq chat clínico + Whisper áudio
    chat/          # REST + WebSocket (Socket.IO)
  shared/
    guards/        # JwtAuthGuard · RolesGuard
    decorators/    # @Public() · @Roles()
```

Cada módulo segue **Clean Architecture**: `domain → application → infrastructure → presentation`. A camada `application` nunca importa TypeORM diretamente.
