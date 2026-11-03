#!/bin/bash
# Encerra a API, o HealthHub e o cronômetro do ensaio. Não apaga nenhum dado nem a planilha.
for porta in 3001 5173 3030; do
  for pid in $(netstat -ano | grep -E "TCP .*:$porta .*LISTENING" | awk '{print $5}' | sort -u); do powershell -NoProfile -Command "Stop-Process -Id $pid -Force" >/dev/null 2>&1; done
done
echo "Ensaio encerrado (API, HealthHub e cronômetro). A planilha coleta_ensaio.csv foi mantida."
