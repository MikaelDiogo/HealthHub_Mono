# HealthHub

Sistema de gestão hospitalar com triagem inteligente para unidades de pequeno e médio porte.

Substitui fichas de papel por um fluxo digital completo: cadastro de pacientes, esteira de cuidado com Protocolo de Manchester, registro seriado de sinais vitais, assistente clínico de IA, chat interno em tempo real e histórico de visitas.

---

## Repositórios

| Pasta | Descrição | README |
|---|---|---|
| `HealthHub-BackEnd/` | API REST + WebSocket — NestJS 10 + PostgreSQL | [Backend README](HealthHub-BackEnd/Readme.md) |
| `HealthHub-Project/` | SPA React — dashboard + triagem mobile + chat | [Frontend README](HealthHub-Project/Readme.md) |

---

## Início rápido (desenvolvimento local)

### 1. Pré-requisitos

- Node.js 20 LTS
- Docker + Docker Compose
- Conta na [Groq](https://console.groq.com) para obter a `GROQ_API_KEY` (IA clínica e transcrição de áudio)

### 2. Clonar e instalar

```bash
git clone <url-do-repositorio>
cd Project_HealthHub

# Backend
cd HealthHub-BackEnd && npm install && cd ..

# Frontend
cd HealthHub-Project && npm install && cd ..
```

### 3. Configurar o backend

```bash
cd HealthHub-BackEnd
cp .env.example .env
```

Preencha o `.env` com no mínimo:

```env
# Gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SECRET_KEY=sua_chave_aqui

# Banco local via Docker (valores já configurados no docker-compose.yml)
DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASS=healthhub2026
DB_NAME=healthhub

# IA — sem esta chave as rotas de chat e áudio retornam 503
GROQ_API_KEY=sua_chave_groq

# Senhas para os usuários de teste
SEED_MEDICO_SENHA=senha_forte_aqui
SEED_RECEPCIONISTA_SENHA=senha_forte_aqui
SEED_ENFERMEIRO_SENHA=senha_forte_aqui
```

### 4. Subir o banco de dados (PostgreSQL via Docker)

```bash
cd HealthHub-BackEnd
docker compose up -d
```

Aguarde o container subir (~5 s) e confirme:

```bash
docker compose ps
# STATUS deve ser "running"
```

**Conexão direta ao banco (para GUI ou psql):**

| Campo | Valor |
|---|---|
| Host | `localhost` |
| Port | `5433` |
| User | `postgres` |
| Password | `healthhub2026` |
| Database | `healthhub` |

```bash
# Acessar via psql dentro do container
docker exec -it healthhub-db psql -U postgres -d healthhub
```

### 5. Rodar as migrations e criar usuários

```bash
cd HealthHub-BackEnd
npm run migration:run   # cria todas as tabelas
npm run seed            # cria os 3 usuários de desenvolvimento
```

### 6. Iniciar backend e frontend

Em dois terminais separados:

```bash
# Terminal 1 — Backend
cd HealthHub-BackEnd
npm run dev
# API em http://localhost:3001
```

```bash
# Terminal 2 — Frontend
cd HealthHub-Project
npm run dev
# App em http://localhost:5173
```

### 7. Acessar o sistema

Abra **http://localhost:5173** e faça login com um dos usuários criados pelo seed:

| E-mail | Papel | Acesso |
|---|---|---|
| `medico@healthhub.com` | Médico | Todas as telas |
| `enfermeiro@healthhub.com` | Enfermeiro | Dashboard, triagem, sinais vitais, IA, chat |
| `recepcionista@healthhub.com` | Recepcionista | Esteira de cuidado, cadastro, chat |

Senha: conforme definido nas variáveis `SEED_*_SENHA` do seu `.env`.

---

## Arquitetura resumida

```
HealthHub-BackEnd/          HealthHub-Project/
  src/                        src/
    modules/                    pages/
      auth/                       Login · Dashboard
      patients/                   Patients · Monitoring
      sinais-vitais/              Alerts · Chat
      fila/           ←HTTP→      ExportPDF · MobileTriage
      visitas/       ←WebSocket→  PoliticaDados
      ai/ (Groq)                components/ · context/
      chat/ (WS)                services/ · utils/
    shared/guards/
    database/migrations/
  docker-compose.yml
```

---

## Documentação técnica

O documento completo de Engenharia de Software está na raiz do monorepo:

```
DOCUMENTO_ENGENHARIA_SOFTWARE.md
```

Contém: requisitos funcionais e não-funcionais, diagramas de arquitetura C4, diagramas de classes, DER conceitual/lógico/físico por subsistema, diagramas de sequência e de estados, especificação completa da API, análise de segurança (STRIDE), débitos técnicos identificados, estratégia de testes e roadmap.

---

## Comandos úteis

```bash
# Verificar containers do banco
docker compose -f HealthHub-BackEnd/docker-compose.yml ps

# Parar o banco (mantém dados)
docker compose -f HealthHub-BackEnd/docker-compose.yml stop

# Destruir banco e dados
docker compose -f HealthHub-BackEnd/docker-compose.yml down -v

# Gerar nova migration após alterar uma entidade
cd HealthHub-BackEnd && npm run migration:generate

# Reverter última migration
cd HealthHub-BackEnd && npm run migration:revert

# Build de produção do frontend
cd HealthHub-Project && npm run build
```
