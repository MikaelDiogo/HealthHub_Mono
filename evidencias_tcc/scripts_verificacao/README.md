# Scripts de verificação (rodada final 2)

Scripts usados para verificar o HealthHub em **banco de teste isolado**, com **dados fictícios** e **IA simulada** (mock), sem tocar no banco de desenvolvimento. Estão aqui, versionados, para qualquer pessoa repetir a verificação a partir de um clone limpo. Nada aqui lê, imprime ou grava chaves: as credenciais dos usuários de teste vêm de variáveis de ambiente `SEED_*`.

## O que cada script faz

| Script | O que verifica |
|---|---|
| `cenarios22/f01.mjs` … `f16_f17.mjs`, `c01_c05.mjs` | Os 22 cenários (F01 a F17 e C01 a C05) pela **tela** (navegador headless) e pela API. `lib.mjs` é a biblioteca comum |
| `e2e_eventos.mjs` | Registro de eventos da esteira pela API (14 checagens) |
| `s1_s8.mjs` | S1 (ordem), S2 (desempate), S3 (reavaliação e evento), S4 (permissão; a mensagem real para a recepção é um item à parte, reprovado por divergência conhecida), S5 (textos sem tempos, estático), S7 (regressão) e S8 (salto de estado, só registra). É a versão consolidada e sem caminhos pessoais; o script original por fases, usado em 03/11/2026, continua em `evidencias/testes/cenarios_accr.mjs` |
| `s6_migration.mjs` | S6: migrações preservam os dados (antes/depois/reversão), em banco **descartável** criado e removido pelo próprio script |
| `tf/tf_casos.mjs` | TF01 a TF08 do Apêndice A (TF01 usa só o nome, a regra do cadastro mínimo) |
| `tf/tf05_fronteiras.mjs` | TF05: alertas nas fronteiras dos limiares (chama as funções reais) |
| `tf/tf08_ui.mjs` | TF08: o que a tela mostra quando a IA falha |
| `concorrencia.mjs` | Admissão concorrente (senha sem repetição, 409 no mesmo paciente) |
| `desempenho.mjs`, `amostrador_recursos.mjs` | Latência (p50/p95/p99), disponibilidade após reinício e uso de recursos |
| `casos_ficticios.csv` | Os 5 casos fictícios (FICTÍCIO-01 a 05) |
| `capturas_rodada2.mjs` | As capturas de tela da rodada 2 (1280 × 800, PNG) e o manifesto parcial, com a IA **simulada**; inclui a captura do PDF (visualizador do navegador) e o erro 429 **simulado** |
| `capturas_ia_real.mjs` | As 4 capturas com o provedor de IA **REAL** (chat com CID e transcrição de áudio). Faz chamadas pagas à Groq (1 de chat e 1 de transcrição por execução; `SO_CHAT=1` pula o áudio). Exige `WAV_FICTICIO` (áudio de voz sintética, arquivo local fora do Git) e a chave só no ambiente do processo da **API** (nunca neste script) |

O mock da IA fica em `evidencias_tcc/mock/mock-groq.cjs` (a API sobe com `node -r ../evidencias_tcc/mock/mock-groq.cjs dist/main`): **nenhuma chamada real à Groq** é feita por estes scripts.

## Ambiente

Node 22+ (testado com Node 24), Docker com PostgreSQL 16 em contêiner **só de teste** (os scripts recusam a porta 5433, que é a de desenvolvimento), Chrome ou Edge instalado (para os scripts de tela).

1. Crie um arquivo de ambiente **fora do repositório** (por exemplo `~/testenv.sh`), com variáveis exportadas: `DB_HOST=localhost`, `DB_PORT=5435` (ou a porta do seu contêiner de teste), `DB_USER`, `DB_PASS`, `DB_NAME` (um banco novo), `SECRET_KEY`, `ALLOWED_ORIGINS` e as seis `SEED_*` (e-mail e senha de cada perfil, dados de teste que você inventa). Não commite esse arquivo.
2. Suba o banco, crie o banco de teste e aplique tudo do zero:
   ```
   cd HealthHub-BackEnd && npm ci && source ~/testenv.sh
   npm run migration:run && npm run seed
   npm run build
   ```
3. Suba a API com a IA **simulada** e, para os scripts de tela, o frontend:
   ```
   GROQ_API_KEY=CHAVE-SIMULADA-NAO-REAL NODE_ENV=development PORT=3001 node -r ../evidencias_tcc/mock/mock-groq.cjs dist/main
   cd ../HealthHub-Project && npm ci && npx vite --port 5173 --strictPort
   ```
4. Os scripts de **tela** precisam de um cliente Chrome DevTools Protocol sem dependências (`cdp.mjs`). Ele **não está** neste repositório (é de terceiros, com licença própria); aponte para a cópia que você tiver:
   ```
   export CDP_LIB=/caminho/para/cdp.mjs
   ```

## Ordem de execução

Cada script grava em `EV_DIR` (ou, se não definido, numa pasta `saida_*` ao lado dele). Use uma pasta de saída por execução.

```
source ~/testenv.sh                      # dentro de HealthHub-BackEnd, com a API de pé
cd ../evidencias_tcc/scripts_verificacao

node e2e_eventos.mjs                     # 14 checagens do registro de eventos
node s1_s8.mjs                           # S1 a S5, S7 e S8
node s6_migration.mjs                    # S6 (cria e remove um banco descartável)
VERSAO=$(git rev-parse --short HEAD) node tf/tf_casos.mjs     # TF01 a TF08
(cd ../../HealthHub-BackEnd && node --import tsx ../evidencias_tcc/scripts_verificacao/tf/tf05_fronteiras.mjs)   # TF05

# 22 cenários (tela). Rode cada arquivo; cada um acrescenta ao resultados.json de EV_DIR.
export CDP_LIB=...; export EV_DIR=./saida_cenarios
for f in cenarios22/f01.mjs cenarios22/f02_f06.mjs cenarios22/f03_f06.mjs cenarios22/f07_f09.mjs cenarios22/f10.mjs \
         cenarios22/f11_f12.mjs cenarios22/f13.mjs cenarios22/f14.mjs cenarios22/f15.mjs cenarios22/f16_f17.mjs cenarios22/c01_c05.mjs; do node $f; done

node concorrencia.mjs final 20           # concorrência da admissão, 20 repetições
```

`desempenho.mjs` (`fila`, `escrita`, `disp`) usa `API_DIR` (a pasta `HealthHub-BackEnd` com o `dist/`) e o banco do ambiente; a metodologia é: aquecimento de 10 requisições, 200 por linha, sequencial e com 10 simultâneos; 500 entradas na fila. Ele reinicia a API e o contêiner do banco no teste de disponibilidade.

## Observações

- O resultado de cada caso é o **observado**. Um caso reprovado **não é ajustado para passar**: descreve-se a falha.
- Os resultados antigos (anteriores à mudança do cadastro) continuam em `evidencias_tcc/rodada_final/`; veja `evidencias_tcc/LEIA-ME_EVIDENCIAS_ANTIGAS.md`.
- Nenhum caminho absoluto pessoal: a raiz do repositório é descoberta a partir da posição dos arquivos.
