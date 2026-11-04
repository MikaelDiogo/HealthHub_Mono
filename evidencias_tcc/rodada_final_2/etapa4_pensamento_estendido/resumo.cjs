const fs = require('fs');
const r = require('./sonda_resultado.json');
const linhas = [];
let somaThinking = 0;
for (const x of r.resultados) {
  const L = fs.readFileSync(`bruto/${x.modelo}_vinheta${x.vinheta}.jsonl`, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  const res = L.find((l) => l.type === 'result');
  const th = res?.usage?.output_tokens_details?.thinking_tokens;
  const thMU = res?.modelUsage?.[x.modelo]?.thinkingTokens;
  somaThinking += (th ?? 0);
  x.thinking_tokens_usage = th ?? null; x.thinking_tokens_modelUsage = thMU ?? null;
  linhas.push(`| ${x.modelo} | ${x.vinheta} | ${JSON.stringify(x.tipos_de_bloco)} | ${x.tokens_out} | ${th} | ${thMU} | ${x.custo_usd.toFixed(4)} |`);
}
r.thinking_tokens_total = somaThinking;
fs.writeFileSync('sonda_resultado.json', JSON.stringify(r, null, 2));
const md = `# Sonda de pensamento estendido (Etapa 4)

Data: ${r.data}. Versão do Claude Code CLI: ${r.versao_cli}. ${r.chamadas} chamadas (3 por modelo, vinhetas 1 a 3 do benchmark), mesma configuração do harness (\`claude -p --model <id> --system-prompt <prompt do harness> --tools "" --no-session-persistence --permission-prompts none --setting-sources ""\`), trocando só \`--output-format json\` por \`stream-json --verbose\`. Custo total: US$ ${r.custo_total_usd.toFixed(4)} (estimado antes: ~US$ 0,05; limite: US$ 1). Nenhuma chave foi lida ou impressa.

| Modelo | Vinheta | Blocos de conteúdo da resposta | tokens_out | thinking_tokens (usage) | thinkingTokens (modelUsage) | Custo (US$) |
|---|---|---|---|---|---|---|
${linhas.join('\n')}

**Conclusão (com a configuração do harness, nas 9 chamadas):** os modelos **Claude Sonnet 5, Claude Sonnet 5.5 e Claude Opus 5.5 NÃO usaram pensamento estendido**. Evidência: (1) nenhuma resposta teve bloco \`thinking\` (só \`text\`); (2) o próprio CLI informa \`thinking_tokens: 0\` em \`usage.output_tokens_details\` e \`thinkingTokens: 0\` em \`modelUsage\` em todas as chamadas (total de tokens de raciocínio: ${somaThinking}); (3) os \`tokens_out\` (${Math.min(...r.resultados.map((x) => x.tokens_out))} a ${Math.max(...r.resultados.map((x) => x.tokens_out))}) correspondem ao JSON visível.

**Limites:** a sonda usou 3 vinhetas por modelo, na versão ${r.versao_cli} do CLI, sem passar nenhuma configuração de pensamento. Não prova que o comportamento seria o mesmo em outra versão do CLI, com outra configuração, ou em vinhetas bem mais difíceis. Os arquivos brutos (\`bruto/*.jsonl\`) contêm só as vinhetas públicas do benchmark e as respostas dos modelos.
`;
fs.writeFileSync('RESULTADO_SONDA.md', md);
console.log(md.split('\n').slice(5, 18).join('\n'));
