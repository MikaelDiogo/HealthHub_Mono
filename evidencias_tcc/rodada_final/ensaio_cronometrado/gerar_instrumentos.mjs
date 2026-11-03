// Gera os instrumentos do ensaio cronometrado papel × HealthHub a partir de casos_fonte.csv.
// Uso: node gerar_instrumentos.mjs     (lê casos_fonte.csv, escreve cartoes_caso.html, formulario_papel.html, coleta_ensaio.csv, roteiro_execucao.md)
// NÃO inventa dados: o que estiver em branco no casos_fonte.csv sai como "(preencher a partir do Apêndice A)".
import fs from 'node:fs';
const DIR = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
function csv(t) { const rows = []; let c = '', q = false, r = []; for (let i = 0; i < t.length; i++) { const ch = t[i]; if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; } else if (ch === '"') q = true; else if (ch === ',') { r.push(c); c = ''; } else if (ch === '\n') { r.push(c); rows.push(r); r = []; c = ''; } else if (ch !== '\r') c += ch; } if (c || r.length) { r.push(c); rows.push(r); } const h = rows[0]; return rows.slice(1).filter((x) => x.length === h.length && x[0]).map((x) => Object.fromEntries(h.map((k, i) => [k, x[i]]))); }
const casos = csv(fs.readFileSync(DIR + 'casos_fonte.csv', 'utf8'));
const PEND = '<span class="pend">(preencher a partir do Apêndice A)</span>';
const v = (x) => (x && x.trim() ? x : PEND);
const REPS = 3;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const estilo = `<style>@page{size:A4;margin:14mm}body{font:14px/1.45 system-ui,Arial,sans-serif;color:#111}.pagina{page-break-after:always;border:2px solid #111;padding:16px;border-radius:6px}h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:14px 0 4px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #333;padding:6px 8px;text-align:left}th{width:34%;background:#f1f1f1}.pend{color:#b00020;font-style:italic}.aviso{font-size:12px;border:1px dashed #555;padding:6px;margin-top:10px}.campo{height:26px}</style>`;

// 1) Cartões de caso (um por paciente)
const cartoes = casos.map((c) => `<div class="pagina"><h1>Cartão do caso ${esc(c.caso)}</h1><p>Paciente FICTÍCIO. Registre exatamente os dados abaixo.</p>
<table><tr><th>Nome</th><td>${esc(c.nome)}</td></tr><tr><th>CPF (fictício)</th><td>${esc(c.cpf_ficticio)}</td></tr><tr><th>Idade</th><td>${v(c.idade)}</td></tr><tr><th>Sexo</th><td>${v(c.sexo)}</td></tr>
<tr><th>Horário de chegada</th><td>${esc(c.chegada)}</td></tr><tr><th>Motivo da visita</th><td>${v(c.motivo_visita)}</td></tr></table>
<h2>Sinais vitais (artificiais)</h2><table><tr><th>Frequência cardíaca (bpm)</th><td>${v(c.frequencia_cardiaca)}</td></tr><tr><th>SpO₂ (%)</th><td>${v(c.saturacao_oxigenio)}</td></tr><tr><th>Temperatura (°C)</th><td>${v(c.temperatura)}</td></tr><tr><th>Pressão arterial</th><td>${v(c.pressao_arterial)}</td></tr></table>
<h2>Categoria de risco a registrar (artificial)</h2><table><tr><th>Categoria</th><td><b>${esc(c.categoria_artificial)}</b></td></tr></table>
<p class="aviso">A categoria foi atribuída <b>artificialmente</b> para testar registro e ordenação; <b>não é classificação clínica validada nem gabarito de gravidade</b>. Não altere o relógio do servidor.</p></div>`).join('\n');
fs.writeFileSync(DIR + 'cartoes_caso.html', `<!doctype html><meta charset="utf-8"><title>Cartões de caso — ensaio cronometrado</title>${estilo}${cartoes}`);

// 2) Formulário de papel (equivalente aos campos do sistema), uma folha por execução
const linhas = (rot) => `<tr><th>${rot}</th><td class="campo"></td></tr>`;
const folha = `<div class="pagina"><h1>Ficha de papel — ensaio cronometrado</h1><p>Caso: ______ &nbsp; Repetição: ____ &nbsp; Tentativa: ( ) familiarização ( ) válida &nbsp; Início: __:__:__ &nbsp; Fim: __:__:__</p>
<h2>Cadastro</h2><table>${['Nome completo', 'CPF', 'Idade', 'Sexo', 'Horário de chegada', 'Motivo da visita'].map(linhas).join('')}</table>
<h2>Sinais vitais</h2><table>${['Frequência cardíaca (bpm)', 'SpO₂ (%)', 'Temperatura (°C)', 'Pressão arterial'].map(linhas).join('')}</table>
<h2>Classificação de risco</h2><table><tr><th>Cor escolhida</th><td class="campo">( ) Vermelho ( ) Laranja ( ) Amarelo ( ) Verde ( ) Azul</td></tr></table></div>`;
fs.writeFileSync(DIR + 'formulario_papel.html', `<!doctype html><meta charset="utf-8"><title>Ficha de papel — ensaio cronometrado</title>${estilo}${folha}`);

// 3) Planilha de coleta (30 linhas válidas + 2 de familiarização) com ordem alternada
const cab = ['caso', 'repeticao', 'tentativa', 'metodo', 'ordem_execucao', 'hora_inicio', 'hora_fim', 'tempo_segundos', 'campos_obrigatorios_completos', 'erros_digitacao_ou_omissoes', 'falhas', 'precisou_ajuda', 'observacoes'];
const linhasCsv = [cab.join(',')];
const roteiro = [];
for (const m of ['papel', 'sistema']) linhasCsv.push(['(familiarizacao)', 0, 'familiarizacao', m, '', '', '', '', '', '', '', '', 'fora do cálculo'].join(','));
for (let r = 1; r <= REPS; r++) casos.forEach((c, i) => {
  const primeiro = (i + (r - 1)) % 2 === 0 ? 'papel' : 'sistema'; const segundo = primeiro === 'papel' ? 'sistema' : 'papel';
  roteiro.push(`| ${r} | ${c.caso} | ${primeiro} → ${segundo} |`);
  [[primeiro, 1], [segundo, 2]].forEach(([m, o]) => linhasCsv.push([c.caso, r, 'valida', m, o, '', '', '', '', '', '', '', ''].join(',')));
});
fs.writeFileSync(DIR + 'coleta_ensaio.csv', linhasCsv.join('\n') + '\n');

// 4) Roteiro de execução
fs.writeFileSync(DIR + 'roteiro_execucao.md', `# Roteiro de execução do ensaio cronometrado (papel × HealthHub)

Ensaio **exploratório, feito pelo próprio desenvolvedor**, com viés de familiaridade; **não estima satisfação de usuários nem demonstra redução de tempo para enfermeiros**. Pacientes 100% fictícios. Não alterar o relógio do servidor. Não preencher tempos estimados nem usar tempos de automação como tempo humano.

## Antes de começar
1. Preencha em \`casos_fonte.csv\` os dados em branco (idade, sexo, motivo, sinais vitais artificiais) **copiando do Apêndice A do TCC**; rode \`node gerar_instrumentos.mjs\` de novo e imprima \`cartoes_caso.html\` (um por página) e \`formulario_papel.html\` (imprima ${casos.length * REPS * 1 + 2} cópias, ou reaproveite a ficha).
2. Suba o sistema local com banco de teste isolado e dados fictícios (sem a IA real).
3. **Tentativa de familiarização:** uma execução em papel e uma no sistema, **fora do cálculo** (linhas \`(familiarizacao)\` da planilha).

## A cada execução (sistema limpo)
- Antes de **cada repetição** do sistema, deixe o sistema limpo: \`node reiniciar_sistema_limpo.mjs\` (apaga fila e pacientes FICTÍCIO-* do banco de teste).
- **Papel:** do momento em que o cartão é apresentado até a ficha preenchida e conferida.
- **Sistema:** do momento em que o cartão é apresentado até a confirmação do registro (cadastro, sinais vitais e cor escolhida pelo enfermeiro).
- Registre na \`coleta_ensaio.csv\`: início, fim, tempo em segundos, se os campos obrigatórios ficaram completos (sim/não, conferidos campo a campo contra o cartão), erros de digitação ou omissões, falhas, se precisou de ajuda e observações. Preserve **todas** as tentativas (inclusive as ruins); se repetir uma execução, registre as duas e declare a regra de análise **antes**.
- Igualdade da categoria artificial comprova só fidelidade de registro, não acurácia clínica.

## Ordem alternada (primeira modalidade → segunda), ${REPS} repetições
| Repetição | Caso | Ordem |
|---|---|---|
${roteiro.join('\n')}

Com ${REPS} repetições (número ímpar) a alternância não fica perfeitamente balanceada por caso; se puder, faça 4 repetições (ajuste \`REPS\` em \`gerar_instrumentos.mjs\`).

## Ficha por execução (campos a guardar no relatório)
ID, requisito relacionado, versão (hash do commit), data, executor, pré-condição, entrada, esperado, obtido, duração, resultado, evidência, falha e correção.

## Depois
Entregue a \`coleta_ensaio.csv\` preenchida e rode \`node analisar_ensaio.mjs\` (estatísticas, tabela e gráfico; sem afirmar significância estatística).
`);
console.log(`ok: ${casos.length} casos, ${linhasCsv.length - 1} linhas na coleta, ${casos.filter((c) => !c.idade || !c.frequencia_cardiaca).length} caso(s) com dados clínicos a preencher`);
