# HealthHub

Sistema de gestão hospitalar com triagem inteligente para unidades de pequeno e médio porte.

Substitui fichas de papel por um fluxo digital completo: cadastro de pacientes, esteira de cuidado com registro da classificação de risco, registro seriado de sinais vitais, assistente clínico de IA, chat interno em tempo real e histórico de visitas.

---

## Repositórios

| Pasta | Descrição | README |
|---|---|---|
| `HealthHub-BackEnd/` | API REST + WebSocket — NestJS 10 + PostgreSQL | [Backend README](HealthHub-BackEnd/Readme.md) |
| `HealthHub-Project/` | SPA React — dashboard + triagem mobile + chat | [Frontend README](HealthHub-Project/Readme.md) |

---

## Início rápido (desenvolvimento local)

### 1. Pré-requisitos

- Node.js 22.12 ou superior (testado em 24.20.0; o piso vem do campo `engines` do Vitest 5, usado em `npm test`)
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

### Regra do cadastro de paciente

**Só o nome é obrigatório.** CPF, RG, idade, sexo, telefone, endereço, alergias, medicamentos e anamnese são opcionais (campo vazio vira `NULL`; o formato só é validado quando há valor; o CPF é único quando informado). O sexo é escolhido em uma lista (Masculino/Feminino) e gravado como `M`/`F`. Se o nome não for conhecido (por exemplo, paciente inconsciente), marque **Nome desconhecido**: o sistema grava "Paciente não identificado (#xxxx)" e marca o paciente como **nome provisório**, com um selo visível nas telas, até alguém corrigir o nome pela edição do paciente (médico e enfermeiro). Detalhes, justificativa e riscos em `DOCUMENTO_ENGENHARIA_SOFTWARE.md`, seção 7.4.

### Verificação de saúde

`GET /health` (sem autenticação) devolve o estado da API e do banco; é o endpoint usado para medir disponibilidade.

### Alertas de sinais vitais e chave `ALERTAS_SEM_FONTE`

Os limiares de alerta (FC, SpO₂, temperatura e **pressão arterial**) ficam centralizados, cada um com a sua fonte, em `HealthHub-BackEnd/src/config/limiares-sinais-vitais.ts` e `HealthHub-Project/src/config/limiaresSinaisVitais.ts`. Desde a rodada 3 **todos têm fonte documental** (POP.HC-UFTM-DENF.003 v6, NEWS2, critérios de SIRS, diretrizes da SBC e linha de cuidado do Ministério da Saúde): temperatura crítica `>= 39,1 °C`, pressão crítica PAS `<= 90`, PAS `>= 180` ou PAD `>= 120`, pressão em atenção PAS 91 a 100, PAS `>= 140` ou PAD `>= 90`. A pressão continua texto livre (`120/80`, `120x80`); formato inválido não gera alerta. A chave `ALERTAS_SEM_FONTE` (backend) e `VITE_ALERTAS_SEM_FONTE` (frontend) segue existindo (padrão `true`; `false` desliga só limiares com `fonte: null`), mas **hoje nenhum limiar está sem fonte, então ela não desliga nenhum alerta real**. Os limiares **não** são validação clínica; "atenção" e "crítico" são convenção do projeto. Evidências e conferência das fontes: `evidencias_tcc/rodada_final_3/`.

---

## Testes e verificação

```bash
# Testes e build (devem passar nos dois pacotes)
cd HealthHub-BackEnd && npm test && npm run build
cd HealthHub-Project && npm test && npm run build
```

A verificação ponta a ponta (22 cenários, S1 a S8, TF01 a TF08, concorrência e desempenho) roda em **banco de teste isolado**, com dados fictícios e a IA simulada: os scripts e o passo a passo estão em `evidencias_tcc/scripts_verificacao/README.md`.

## Onde estão os materiais do TCC

- `benchmark/`: harness, vinhetas e CSVs por chamada do benchmark dos modelos (com o README que conferiu a Tabela 2 e a verificação de pensamento estendido).
- `evidencias_tcc/`: evidências das rodadas de testes (`rodada_final/`, `rodada_final_2/`), os scripts de verificação (`scripts_verificacao/`) e `LEIA-ME_EVIDENCIAS_ANTIGAS.md`, que lista o que é anterior à mudança do cadastro.
- `RESULTADOS_PARA_TCC.md` e `RESULTADOS_PARA_TCC_2.md`: resultados por rodada, com números, caminhos das evidências e limitações.

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
