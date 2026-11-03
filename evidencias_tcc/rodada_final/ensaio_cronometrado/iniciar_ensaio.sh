#!/bin/bash
# Sobe TUDO do ensaio: banco de teste limpo (healthhub_test_ensaio), API do HealthHub (IA SIMULADA, sem custo), o HealthHub (frontend)
# e o cronômetro, e abre as páginas no navegador. Só dados fictícios. Chame pelo INICIAR_ENSAIO.bat.
# Opção: --sem-abrir  (não abre o navegador; usado em testes)
cd "$(dirname "$0")/../../.." || exit 1
ROOT=$(pwd)
ENSAIO_DIR="$ROOT/evidencias_tcc/rodada_final/ensaio_cronometrado"
ENV_BASE=/tmp/testenv.sh
DB=healthhub_test_ensaio

[ -f "$ENV_BASE" ] || { echo "ERRO: arquivo do ambiente de teste ($ENV_BASE) não encontrado. Peça ajuda antes de continuar."; exit 1; }
docker info >/dev/null 2>&1 || { echo "ERRO: o Docker não está rodando. Abra o Docker Desktop, espere ele ficar verde e rode de novo."; exit 1; }
docker start healthhub-test-db >/dev/null 2>&1; sleep 4

# para o que já estiver rodando nas portas do ensaio
for porta in 3001 5173 3030; do
  for pid in $(netstat -ano | grep -E "TCP .*:$porta .*LISTENING" | awk '{print $5}' | sort -u); do powershell -NoProfile -Command "Stop-Process -Id $pid -Force" >/dev/null 2>&1; done
done

# ambiente do banco do ensaio (copia o ambiente de teste trocando só o nome do banco)
sed "s#DB_NAME=healthhub_test\$#DB_NAME=$DB#; s#DB_NAME=healthhub_test #DB_NAME=$DB #" "$ENV_BASE" > /tmp/testenv_ensaio.sh
grep -q "DB_NAME=$DB" /tmp/testenv_ensaio.sh || { echo "ERRO: não consegui configurar o banco do ensaio."; exit 1; }

if ! docker exec healthhub-test-db psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB'" | grep -q 1; then
  echo "Criando o banco de teste do ensaio ($DB)..."
  docker exec healthhub-test-db psql -U postgres -qc "CREATE DATABASE $DB" || exit 1
  ( source /tmp/testenv_ensaio.sh; cd "$ROOT/HealthHub-BackEnd" && npm run migration:run >/dev/null 2>&1 && npm run seed >/dev/null 2>&1 )
  docker exec healthhub-test-db psql -U postgres -d $DB -qc "UPDATE users SET nome='Enfermeiro Teste' WHERE role='enfermeiro'"
fi
docker exec healthhub-test-db psql -U postgres -d $DB -qc "DELETE FROM fila_pacientes; DELETE FROM pacientes WHERE nome_completo LIKE 'FICTÍCIO-%';" >/dev/null

source /tmp/testenv_ensaio.sh
export NODE_ENV=development PORT=3001 GROQ_API_KEY=CHAVE-SIMULADA-NAO-REAL   # IA simulada: nenhuma chamada paga
( cd "$ROOT/HealthHub-BackEnd" && { [ -f dist/main.js ] || npm run build >/dev/null 2>&1; } && nohup node -r ../evidencias_tcc/mock/mock-groq.cjs dist/main > "$ENSAIO_DIR/api_ensaio.log" 2>&1 & )
( cd "$ROOT/HealthHub-Project" && nohup npx vite --port 5173 --strictPort > "$ENSAIO_DIR/vite_ensaio.log" 2>&1 & )
( cd "$ENSAIO_DIR" && PORT=3030 ENSAIO_DB=$DB nohup node servidor_cronometro.mjs > "$ENSAIO_DIR/cronometro_servidor.log" 2>&1 & )

# contas de login (arquivo local, fora do Git; não é impresso na tela)
{ echo "Contas de login do HealthHub para o ensaio (banco de teste, dados fictícios). Não compartilhe."; echo "recepcionista: $SEED_RECEPCIONISTA_EMAIL | senha: $SEED_RECEPCIONISTA_SENHA"; echo "enfermeiro:    $SEED_ENFERMEIRO_EMAIL | senha: $SEED_ENFERMEIRO_SENHA"; echo "medico:        $SEED_MEDICO_EMAIL | senha: $SEED_MEDICO_SENHA"; } > "$ENSAIO_DIR/credenciais_ensaio.txt"

echo "Aguardando o sistema subir..."
for i in $(seq 1 40); do
  A=$(curl -s -o /dev/null -w "%{http_code}" localhost:3001/health); W=$(curl -s -o /dev/null -w "%{http_code}" localhost:5173/); C=$(curl -s -o /dev/null -w "%{http_code}" localhost:3030/)
  [ "$A$W$C" = "200200200" ] && break; sleep 3
done
echo "API: $A | HealthHub: $W | Cronômetro: $C"
[ "$A$W$C" = "200200200" ] || { echo "ATENÇÃO: algo não subiu. Veja os arquivos .log nesta pasta ou peça ajuda."; exit 1; }
echo
echo "PRONTO."
echo " - Cronômetro:  http://localhost:3030"
echo " - HealthHub:   http://localhost:5173   (contas em: evidencias_tcc/rodada_final/ensaio_cronometrado/credenciais_ensaio.txt)"
echo "Para encerrar tudo depois: PARAR_ENSAIO.bat"
if [ "$1" != "--sem-abrir" ]; then cmd.exe /c start "" http://localhost:3030 >/dev/null 2>&1; cmd.exe /c start "" http://localhost:5173 >/dev/null 2>&1; fi
