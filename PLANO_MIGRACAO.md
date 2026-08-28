# 🏥 HealthHub — Plano Completo de Migração e Evolução

> **Objetivo:** Migrar o backend de Express 5 para **NestJS com Clean Architecture** e reestruturar o frontend em **módulos por feature** (padrão Volt), preservando 100% das funcionalidades atuais e preparando o terreno para as novas: **Chat interno**, **Notificações em tempo real** e **PDF no backend**.
>
> ⚠️ **Decisão de arquitetura:** integração com Telegram foi **descartada** — dados de paciente são sensíveis (LGPD) e não devem trafegar por plataformas de terceiros. Toda comunicação acontece **dentro do sistema** (chat interno + notificações via WebSocket).

---

## 📋 Índice

1. [Estado Atual do Sistema](#1-estado-atual-do-sistema)
2. [Arquitetura Alvo](#2-arquitetura-alvo)
3. [Migração do Backend (NestJS)](#3-migração-do-backend-nestjs)
4. [Migração do Frontend (Modular)](#4-migração-do-frontend-modular)
5. [Banco de Dados](#5-banco-de-dados)
6. [Segurança](#6-segurança)
7. [Novas Funcionalidades](#7-novas-funcionalidades)
8. [Fases de Execução](#8-fases-de-execução)
9. [Checklist de Validação](#9-checklist-de-validação)

---

## 1. Estado Atual do Sistema

### 1.1 Stack atual

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Mantine UI 8 + Tabler Icons + Recharts + jsPDF |
| Backend | Express 5 + TypeORM 0.3 + Zod v4 |
| Banco | PostgreSQL em **Docker local** (migrado do Supabase) |
| Auth | JWT com roles (`medico`, `enfermeiro`, `recepcionista`) em localStorage |
| IA | Groq API (chat clínico + transcrição de áudio) |

### 1.2 Funcionalidades existentes (devem ser 100% preservadas)

| Funcionalidade | Rota frontend | Roles | Backend |
|---|---|---|---|
| Login com JWT | `/` | todos | `POST /login` |
| Dashboard de sinais vitais | `/main` | medico, enfermeiro | `GET /patients/:id/vitals` |
| CRUD de pacientes | `/main/pacientes` | todos (recepcionista: form reduzido) | `GET/POST /patients`, `GET/PUT /patients/:id` |
| Registro de sinais vitais | — | medico, enfermeiro | `POST /sinais/:id` |
| Monitoramento com IA (chat + áudio) | `/main/monitor` | medico, enfermeiro | `POST /patients/:id/chat`, `POST /patients/:id/chat/audio` |
| Esteira de Cuidado (Kanban) | `/main/alertas` | todos | `GET/POST /fila`, `PUT/DELETE /fila/:id` |
| Exportar prontuário PDF | `/main/exportar` | medico, enfermeiro | jsPDF (frontend) |
| **Triagem Mobile** | mobile (`MobileTriage` + `MobileLayout` + `useMobile`) | enfermeiro | mesmas rotas de pacientes/sinais |
| Política de dados / Termos de uso | `/politica` | público | `gerarPDFPolitica.ts` |
| Identidade visual HealthHub | `theme.ts` + redesign recente | — | — |

### 1.3 Entidades atuais

- `Paciente` — dados pessoais e hospitalares
- `SinaisVitais` — FK para paciente, histórico de medições
- `FilaPaciente` — esteira de cuidado (tabela `fila_pacientes`)
- `User` — usuários com role (tabela `users`)

### 1.4 Segurança já aplicada (portar tudo)

- Helmet, rate limiting no login (10 tentativas/15min), CORS restrito por origem
- SECRET_KEY obrigatória via env (servidor não sobe sem)
- Validação Zod em POST/PUT + `validateUUID` em params
- RBAC nas rotas de fila (delete=medico, put=medico+enfermeiro)
- Seed sem senhas hardcoded (`SEED_*_SENHA` no .env)
- Frontend: expiração de JWT + logout automático em 401

---

## 2. Arquitetura Alvo

### 2.1 Referência: padrão Volt

- **Backend:** [Volt_BackEnd](https://github.com/MikaelDiogo/Volt_BackEnd) — NestJS 10 + Clean Architecture (application / domain / infrastructure / presentation)
- **Frontend:** [Volt_FrontEnd](https://github.com/MikaelDiogo/Volt_FrontEnd) — módulos por feature (hooks / pages / services / schemas / types)

### 2.2 Visão geral do sistema após a migração

```
┌─────────────────────────────────────────────────┐
│         Frontend React (Vite)                   │
│         desktop + mobile triage                 │
└──────────┬───────────────┬──────────────────────┘
           │ HTTP (axios)  │ WebSocket (chat/notifs)
┌──────────▼───────────────▼──────────────────────┐
│               Backend NestJS                    │
│  auth │ patients │ vitals │ fila │ chat │ ai │ pdf
│           Guards · Pipes · Gateways             │
└──────────────────────┬──────────────────────────┘
                       │ TypeORM
            ┌──────────▼──────────┐
            │ PostgreSQL (Docker) │
            └─────────────────────┘
```

---

## 3. Migração do Backend (NestJS)

### 3.1 Stack alvo

| Recurso | Pacote |
|---|---|
| Framework | NestJS 10 |
| ORM | TypeORM 0.3 (`@nestjs/typeorm`) |
| Auth | `@nestjs/jwt` + `passport-jwt` |
| Validação | `class-validator` + `class-transformer` |
| Config | `@nestjs/config` (validação de env no boot) |
| Docs | `@nestjs/swagger` (novo — documentação automática) |
| Rate limit | `@nestjs/throttler` |
| WebSocket | `@nestjs/websockets` + Socket.IO (para chat/notificações) |
| PDF | `pdfmake` ou `puppeteer` (geração server-side) |

### 3.2 Estrutura de pastas

```
HealthHub-BackEnd/src/
  config/
    typeorm.config.ts
    env.validation.ts          ← valida SECRET_KEY, DB_*, GROQ_API_KEY no boot
  database/
    migrations/                ← aproveitar as 4 migrations existentes
    seeds/
  modules/
    auth/
    patients/
    sinais-vitais/
    fila/
    chat/                      ← NOVO
    notifications/             ← NOVO
    ai/                        ← chat IA + transcrição (Groq)
    pdf/                       ← NOVO (geração server-side)
  shared/
    decorators/
      roles.decorator.ts       ← @Roles('medico', 'enfermeiro')
      current-user.decorator.ts
    guards/
      jwt-auth.guard.ts
      roles.guard.ts
      ws-jwt.guard.ts          ← auth de WebSocket
    helpers/
    transformers/
  app.module.ts
  main.ts
```

Cada módulo segue Clean Architecture:

```
modules/<modulo>/
  application/     ← services (um por use case)
  domain/          ← entities + interfaces de repositório (IXxxRepository)
  infrastructure/  ← implementações TypeORM dos repositórios
  presentation/    ← controller + DTOs + <modulo>.module.ts
```

### 3.3 Módulos — detalhamento

#### `auth`
- **application:** `AuthService` (login, validateUser, geração de token)
- **domain:** `User` entity, `IUserRepository`
- **infrastructure:** `UserRepository`, `JwtStrategy`
- **presentation:** `AuthController` (`POST /login`), `LoginDto`
- Token deve manter o payload atual: `{ token, role, nome }` para o frontend não quebrar

#### `patients`
- **application:** `CreatePatientService`, `ListPatientService`, `ShowPatientService`, `UpdatePatientService`
- **presentation:** `CreatePatientDto`, `UpdatePatientDto` (portar regras Zod → class-validator; manter o form reduzido da recepcionista — campos hospitalares opcionais)

#### `sinais-vitais`
- **application:** `CreateSinaisVitaisService`, `GetVitalsHistoryService`, `GetCurrentVitalsService`
- Rotas: `POST /sinais/:id`, `GET /patients/:id/vitals`

#### `fila`
- **application:** `CreateFilaService`, `ListFilaService`, `UpdateFilaService`, `DeleteFilaService`
- RBAC: delete=`medico`, put=`medico`+`enfermeiro`, get/post=autenticados
- **Evolução:** emitir evento WebSocket ao mudar status na esteira (Kanban atualiza em tempo real, sem refresh)

#### `ai` (extração do que hoje está em patients)
- **application:** `PatientChatService` (Groq chat), `AudioTranscriptionService` (Groq Whisper)
- Rotas mantidas: `POST /patients/:id/chat`, `POST /patients/:id/chat/audio`
- Isolar a chave GROQ_API_KEY em config validada

### 3.4 Tabela de substituições

| Express atual | NestJS |
|---|---|
| Zod schemas | DTOs com class-validator |
| `authMiddleware` | `JwtAuthGuard` |
| `checkRole` | `RolesGuard` + `@Roles()` |
| `validateUUID` | `ParseUUIDPipe` nativo |
| Express Router | `@Controller()` + decorators HTTP |
| Rate limit manual | `@nestjs/throttler` |
| Helmet no server.ts | Helmet no `main.ts` |

### 3.5 `main.ts` — obrigatório portar

```ts
- Helmet
- ValidationPipe global { whitelist: true, forbidNonWhitelisted: true, transform: true }
- CORS restrito (ALLOWED_ORIGINS em produção)
- ThrottlerGuard no /login
- Boot falha se SECRET_KEY / DB ausentes (env.validation.ts)
- Swagger em /docs (apenas em dev)
```

### 3.6 Contrato de API — rotas a manter idênticas

```
POST   /login
GET    /patients            POST /patients
GET    /patients/:id        PUT  /patients/:id
GET    /patients/:id/vitals
POST   /sinais/:id
GET    /fila                POST /fila
PUT    /fila/:id            DELETE /fila/:id
POST   /patients/:id/chat
POST   /patients/:id/chat/audio
```

> **Regra de ouro:** o frontend atual deve funcionar sem nenhuma alteração contra o backend NestJS antes de começar a fase de frontend.

---

## 4. Migração do Frontend (Modular)

### 4.1 Estrutura alvo

```
HealthHub-Project/src/
  app/
    providers/
      AuthProvider.tsx
      QueryProvider.tsx        ← React Query (novo)
    routes/
      AppRoutes.tsx            ← rotas + guards por role centralizados
    App.tsx
    theme.ts
    global.css
  assets/
  layouts/
    MainLayout/                ← atual Layouts/index.tsx
    MobileLayout/              ← triagem mobile
  modules/
    auth/
    dashboard/
    patients/
    alerts/
    monitoring/
    export-pdf/
    triage/                    ← MobileTriage
    policy/
    chat/                      ← NOVO
  shared/
    components/
      PageShell/  FilterField/  InputField/
      CardDashboard/  CardPatient/  PatientSideBarCard/
      GraphVital/  SideBar/  TermosUsoModal/  Buttons/
    hooks/
      useMobile.ts
    lib/
      api.ts                   ← axios instance + interceptor 401
      socket.ts                ← NOVO: cliente Socket.IO
    types/
      patient.ts
    utils/
      formatters.ts
      gerarPDFPolitica.ts
  stores/                      ← Zustand (novo)
    useAuthStore.ts
    useCareStore.ts            ← substitui CareContext
    useChatStore.ts            ← NOVO
  main.tsx
```

### 4.2 Estrutura por módulo

```
modules/<modulo>/
  pages/       ← componente de página
  hooks/       ← React Query (useXxx)
  services/    ← chamadas API (axios)
  schemas/     ← validação Zod dos forms
  types/       ← interfaces TS
```

### 4.3 Mapeamento módulo a módulo

| Módulo | pages | hooks | services | Origem atual |
|---|---|---|---|---|
| `auth` | LoginPage | useLogin | authService | `pages/Login` |
| `dashboard` | DashboardPage | useVitals | vitalsService | `pages/Dashboard` |
| `patients` | PatientsPage | usePatients, usePatient | patientsService | `pages/Patients` + `ModalEditPatient` |
| `alerts` | AlertsPage | useFila | filaService | `pages/Alerts` |
| `monitoring` | MonitoringPage | useAIChat | aiService | `pages/Monitoring` |
| `export-pdf` | ExportPDFPage | — | pdfService | `pages/ExportPDF` |
| `triage` | MobileTriagePage | useTriage | (reusa patients/vitals) | `pages/MobileTriage` |
| `policy` | PolicyPage | — | — | `pages/PoliticaDados` |
| `chat` | ChatPage | useChat, useConversations | chatService | **novo** |

### 4.4 Melhorias na migração do frontend

1. **React Query** para todo data-fetching (cache, refetch, loading states) — elimina useEffect + useState manuais
2. **Zustand** substitui `CareContext` e `AuthContext` (decisão: padrão Volt usa stores)
3. **Path alias `@/`** no `vite.config.ts` + `tsconfig`
4. **Token:** avaliar migrar de localStorage para memória + refresh (fase de segurança); no mínimo centralizar leitura no `useAuthStore`
5. Guards de rota declarativos em `AppRoutes.tsx` (roles por rota num único lugar, em vez de espalhado)

---

## 5. Banco de Dados

### 5.1 Situação

- PostgreSQL em **Docker local** (já migrado do Supabase) — manter `docker-compose.yml`
- 4 migrations existentes: base schema, update sinais vitais, fila_pacientes, users → **reaproveitar** no NestJS (TypeORM migrations são portáveis)

### 5.2 Novas tabelas (fase de novas features)

```sql
-- Chat interno
conversations              (id, type: 'direct'|'group'|'patient', patient_id?, name?, created_at)
conversation_participants  (conversation_id, user_id, joined_at, last_read_at)
messages                   (id, conversation_id, sender_id, content, priority: 'normal'|'urgente',
                            patient_ref?, created_at)   -- imutáveis: sem update/delete

-- Notificações
notifications              (id, user_id, type, payload jsonb, read_at?, created_at)

-- Auditoria (LGPD)
audit_logs                 (id, user_id, action, resource, resource_id, created_at)
```

### 5.3 Scripts npm (padrão Volt)

```
migration:run  ·  migration:generate  ·  migration:revert  ·  seed
```

---

## 6. Segurança

### 6.1 Portar (paridade com o atual)

- [ ] Helmet, CORS restrito, rate limit login, SECRET_KEY obrigatória
- [ ] RBAC em todas as rotas (`JwtAuthGuard` + `RolesGuard` globais; `@Public()` só no login)
- [ ] Validação de todos os bodies (ValidationPipe) e UUIDs (ParseUUIDPipe)
- [ ] Seed lendo `SEED_*_SENHA` do .env

### 6.2 Novas medidas

- [ ] **`env.validation.ts`** — boot falha listando todas as envs ausentes de uma vez
- [ ] **`ws-jwt.guard.ts`** — WebSocket exige JWT no handshake (chat/notificações)
- [ ] **Auditoria** — `audit_logs` para acesso a dados de paciente (LGPD)
- [ ] **Chat:** só participantes acessam a conversa; threads de paciente restritas a quem atende
- [ ] **Mensagens imutáveis** — sem endpoint de edição/exclusão (rastro clínico)
- [ ] **Dados dentro de casa** — nenhuma integração com plataformas de mensageria de terceiros (Telegram/WhatsApp); dados de paciente nunca saem da infraestrutura do sistema
- [ ] Interceptor global que remove `senha`/hash de qualquer resposta

---

## 7. Novas Funcionalidades

### 7.1 💬 Chat Interno (recepcionista ↔ enfermeiro ↔ médico)

**Tipos de conversa:**
1. **Direta (1:1)** — contatos filtrados por papel e plantão
2. **Grupo por setor** — "Triagem", "Emergência", "Plantão Noturno"
3. **Thread de paciente** — conversa anexada ao atendimento; vira histórico auditável no prontuário

**Recursos:**
- Prioridade `normal` / `urgente` (notificação diferenciada)
- Menção a paciente com link para o card (`patient_ref`)
- Confirmação de leitura (`last_read_at` por participante)
- Contador de não lidas na SideBar
- Mensagens imutáveis

**Backend — módulo `chat`:**
```
application/   SendMessageService, ListConversationsService,
               ListMessagesService, CreateConversationService,
               MarkAsReadService
domain/        Conversation, Message, IChatRepository
presentation/  ChatController (REST: histórico) + ChatGateway (WS: tempo real)
```

**Rotas REST + eventos WS:**
```
GET  /chat/conversations              GET  /chat/conversations/:id/messages
POST /chat/conversations              POST /chat/conversations/:id/read

WS   message:send → message:new       WS   conversation:read
```

**Frontend — módulo `chat`:** ChatPage (lista de conversas + janela), `useChatStore` (mensagens em tempo real via `socket.ts`), badge de não lidas na SideBar.

### 7.2 🔔 Notificações em tempo real (módulo `notifications`)

- Novo paciente na fila → notifica médicos/enfermeiros de plantão
- Mudança de status na esteira → Kanban atualiza sem refresh
- Mensagem urgente no chat → toast destacado
- Sinais vitais críticos registrados → alerta para médicos
- Persistidas em `notifications` (sino na topbar com histórico)

### 7.3 📄 PDF no backend (módulo `pdf`)

Mover a geração de prontuário do jsPDF (frontend) para o backend:
- `GET /patients/:id/pdf` → retorna o PDF gerado server-side
- **Motivos:** layout consistente, dados sempre atualizados, permite anexar o PDF em conversas do chat interno (ex.: médico envia prontuário na thread do paciente)
- jsPDF pode permanecer apenas para a política de dados (documento estático)
- Todo download de PDF de paciente registrado em `audit_logs`

---

## 8. Fases de Execução

### Fase 1 — Backend NestJS (núcleo) 🔴 crítica
1. Criar projeto NestJS em `HealthHub-BackEnd` (backup do Express antes — branch `legacy-express`)
2. `typeorm.config.ts` + migrations existentes + `env.validation.ts` + docker-compose
3. Módulo `auth` completo (validar login antes de continuar)
4. Módulos `patients` + `sinais-vitais`
5. Módulo `fila`
6. Módulo `ai` (chat Groq + áudio)
7. **Gate:** frontend atual 100% funcional contra o NestJS

### Fase 2 — Frontend modular
8. `app/` + `shared/` + path alias + axios/React Query/Zustand
9. Migrar módulo a módulo: auth → patients → dashboard → alerts → monitoring → export-pdf → triage → policy
10. **Gate:** paridade visual e funcional total (desktop + mobile triage)

### Fase 3 — Tempo real
11. `ChatGateway` + `ws-jwt.guard` + tabelas de chat
12. Módulo `chat` (backend REST+WS → frontend)
13. Módulo `notifications` (fila/Kanban em tempo real, sino, toasts)

### Fase 4 — Expansão
14. Módulo `pdf` (prontuário server-side + anexo no chat interno)
15. `audit_logs` + revisão LGPD final

> **Regra:** cada fase tem um "gate" — não avançar sem o sistema estar inteiro funcionando. Backend primeiro mantém o frontend atual vivo durante toda a Fase 1.

---

## 9. Checklist de Validação

### Por endpoint migrado
- [ ] Mesma rota, mesmo shape de request/response do Express
- [ ] `JwtAuthGuard` + `@Roles()` corretos
- [ ] DTO com validação equivalente ao schema Zod antigo
- [ ] Testado com o frontend real (não só Swagger)

### Fim da Fase 1
- [ ] Login dos 3 roles funciona
- [ ] CRUD de pacientes (incl. form reduzido da recepcionista)
- [ ] Sinais vitais: registro + histórico + gráficos
- [ ] Kanban da esteira: criar/mover/remover com RBAC
- [ ] Chat IA + transcrição de áudio
- [ ] Rate limit, Helmet, CORS ativos; boot falha sem envs

### Fim da Fase 2
- [ ] Todas as rotas/guards por role idênticos
- [ ] Triagem mobile funcional
- [ ] Nenhum import quebrado (`@/` em todo lugar)
- [ ] Export PDF e política de dados funcionando

### Fases 3–4
- [ ] Chat: mensagens em tempo real entre dois navegadores logados com roles diferentes
- [ ] Não participante recebe 403 ao acessar conversa
- [ ] Kanban atualiza em outra sessão sem refresh
- [ ] PDF via `GET /patients/:id/pdf` idêntico ao do frontend
- [ ] Acesso a dados de paciente (PDF, prontuário) gera registro em `audit_logs`

---

*Documento gerado em 27/08/2026 — HealthHub TCC*
