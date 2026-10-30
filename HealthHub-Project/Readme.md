# HealthHub — Frontend

Dashboard de monitoramento e triagem hospitalar. Interface responsiva com trilha dedicada para dispositivos móveis.

**Stack:** React 19 · TypeScript · Vite 7 · Mantine UI 8 · Socket.IO Client · Recharts · jsPDF

---

## Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 22.12 ou superior (testado em 24.20.0; piso pelo `engines` do Vitest 5) |
| npm | 10 |
| Backend HealthHub | rodando em `localhost:3001` |

---

## Instalação e execução

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar em modo desenvolvimento
npm run dev
```

Acesse em: **http://localhost:5173**

> O backend precisa estar rodando antes de abrir o frontend. Veja as instruções em [`HealthHub-BackEnd/Readme.md`](../HealthHub-BackEnd/Readme.md).

---

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o Vite dev server com hot-reload |
| `npm run build` | Compila TypeScript e gera `dist/` |
| `npm run preview` | Serve o build local para pré-visualização |
| `npm run lint` | ESLint 9 com regras React Hooks |

---

## Páginas e rotas

| Rota | Página | Papéis |
|---|---|---|
| `/` | Login | público |
| `/main` | Dashboard de sinais vitais | médico, enfermeiro |
| `/main/pacientes` | Cadastro e prontuário (abas: Dados Clínicos + Histórico de Visitas) | todos |
| `/main/monitor` | Assistente de IA + transcrição de áudio | médico, enfermeiro |
| `/main/alertas` | Esteira de Cuidado (Kanban com classificação de risco) | todos |
| `/main/exportar` | Exportar prontuário em PDF | médico, enfermeiro |
| `/main/politica` | Política de dados LGPD | todos |
| `/chat` | Chat interno em tempo real | todos |
| `/mobile` | Triagem otimizada para celular | enfermeiro, recepcionista |

---

## URL da API

A URL base está definida em `src/services/api.ts` e `src/services/chatService.ts`:

```ts
baseURL: 'http://localhost:3001'
```

Para apontar para outro ambiente, altere a constante `BASE_URL` nos dois arquivos — ou, melhor, crie uma variável de ambiente Vite:

```env
# .env.local
VITE_API_URL=http://localhost:3001
```

---

## Estrutura do projeto

```
src/
  assets/          # imagens e ícones estáticos
  components/      # componentes reutilizáveis
    Buttons/       # botões de ação e modais
    CardPatient/   # card da listagem de pacientes
    CardDashboard/ # métricas do painel
    ChatBubble/    # bolinha flutuante de chat
    GraphVital/    # gráfico de sinais vitais
    SideBar/       # navegação lateral por papel
    TermosUsoModal/# modal de aceite LGPD
    PageShell/     # cabeçalho padrão de página
    PatientSideBarCard/
    FilterField/
    InputField/
  context/
    AuthContext.tsx  # role · nome · setAuth · clearAuth
    CareContext.tsx  # fila de atendimento e operações
  hooks/
    useMobile.ts   # detecção de viewport ≤ 768 px
  Layouts/
    index.tsx      # AppShell + SideBar + ChatBubble
    MobileLayout.tsx
  pages/
    Login/
    Dashboard/
    Patients/      # com aba de Histórico de Visitas
    Monitoring/    # IA + áudio
    Alerts/        # Kanban da esteira
    ExportPDF/
    Chat/
    MobileTriage/
    PoliticaDados/
  services/
    api.ts         # axios com interceptors de JWT e 401
    chatService.ts # Socket.IO + fallback REST + dedupe
  types/
    patient.ts
  utils/
    vitalStatus.ts   # limiares clínicos e cores da classificação de risco
    formatters.ts    # máscaras CPF e telefone
    gerarPDFPolitica.ts
  theme.ts         # paleta hub/slate · tipografia · defaults
```

---

## Autenticação

O login salva `token`, `role` e `nome` no `localStorage`. Toda requisição axios injeta o `Bearer token` automaticamente. Se o token estiver expirado ou o servidor retornar `401`, o frontend limpa a sessão e redireciona para `/`.

O WebSocket do chat autentica pelo mesmo JWT no handshake:

```ts
io(BASE_URL, { auth: { token } })
```
