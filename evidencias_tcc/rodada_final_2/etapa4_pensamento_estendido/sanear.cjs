// Mantém nos arquivos brutos só os eventos "assistant" (resposta) e "result" (uso de tokens e custo). O evento "system/init" (caminho do
// computador, lista de ferramentas e conectores da conta) é removido antes de publicar; o resto é mantido como o CLI devolveu.
const fs = require('fs');
let removidos = 0;
for (const f of fs.readdirSync('bruto')) {
  const linhas = fs.readFileSync('bruto/' + f, 'utf8').split('\n').filter(Boolean);
  const mantidas = linhas.filter((l) => { const t = JSON.parse(l).type; if (t === 'assistant' || t === 'result') return true; removidos++; return false; });
  fs.writeFileSync('bruto/' + f, mantidas.join('\n') + '\n');
}
console.log('eventos removidos:', removidos);
