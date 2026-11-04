// Junta o manifesto parcial (capturas simuladas) com as capturas do provedor de IA REAL e grava figuras_manifesto.csv.
const fs = require('fs');
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
function lerCsv(t) {
  const rows = []; let c = '', q = false, r = [];
  for (let i = 0; i < t.length; i++) { const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { r.push(c); c = ''; } else if (ch === '\n') { r.push(c); rows.push(r); r = []; c = ''; } else if (ch !== '\r') c += ch; }
  const h = rows[0]; return rows.slice(1).filter((x) => x.length === h.length).map((x) => Object.fromEntries(h.map((k, i) => [k, x[i]])));
}
const parcial = lerCsv(fs.readFileSync('capturas/figuras_manifesto_parcial.csv', 'utf8'));
const COMMIT = '98b375d';
const ia = [
  { arquivo: 'novo04_chat_ia_cid.png', figura: 'Seção 4.3.3', tela: 'Chat de IA com a resposta REAL da Groq: hipóteses diagnósticas e sugestão de CID (M54.5)', perfil: 'Médico', paciente: 'FICTÍCIO-06 484460', data_hora: '04/11/2026 10:21 (13:21 UTC)', resultado: 'OK',
    observacoes: 'Provedor REAL (Groq, modelo openai/gpt-oss-120b); resposta em cerca de 6 s; mesma pergunta do ensaio anterior. A tabela em Markdown aparece como texto corrido porque o chat não renderiza tabelas (limitação já registrada). Uma primeira tentativa foi capturada antes de a resposta chegar e foi descartada (capturas_descartadas_1/ia_real_primeira_tentativa/)' },
  { arquivo: 'novo05_transcricao_1_gravando.png', figura: 'Seção 4.3.3', tela: 'Transcrição de áudio: gravação em andamento (microfone simulado com voz sintética)', perfil: 'Médico', paciente: 'FICTÍCIO-06 380801', data_hora: '04/11/2026 10:19 (13:19 UTC)', resultado: 'OK', observacoes: 'Áudio de voz sintética (Windows, pt-BR), ditado fictício de cerca de 42 s; modelo de transcrição REAL: whisper-large-v3-turbo' },
  { arquivo: 'novo06_transcricao_2_transcrevendo.png', figura: 'Seção 4.3.3', tela: 'Transcrição de áudio: transcrevendo (aguardando a Groq)', perfil: 'Médico', paciente: 'FICTÍCIO-06 380801', data_hora: '04/11/2026 10:20 (13:20 UTC)', resultado: 'OK', observacoes: 'Provedor REAL (whisper-large-v3-turbo)' },
  { arquivo: 'novo07_transcricao_3_texto.png', figura: 'Seção 4.3.3', tela: 'Transcrição de áudio: texto transcrito preenchendo o campo da pergunta (487 caracteres)', perfil: 'Médico', paciente: 'FICTÍCIO-06 380801', data_hora: '04/11/2026 10:20 (13:20 UTC)', resultado: 'OK', observacoes: 'Provedor REAL (whisper-large-v3-turbo); a transcrição omite alguns acentos ("comecou", "esforco"), como devolvido pelo modelo' },
].map((x) => ({ ...x, commit: COMMIT }));
const todas = [...parcial.filter((x) => x.resultado === 'OK' && x.arquivo.endsWith('.png')), ...ia];
const cab = ['arquivo', 'figura', 'tela', 'perfil', 'paciente', 'data_hora', 'commit', 'resultado', 'observacoes'];
fs.writeFileSync('capturas/figuras_manifesto.csv', [cab.join(','), ...todas.map((m) => cab.map((c) => csvCell(m[c])).join(','))].join('\n') + '\n');
fs.unlinkSync('capturas/figuras_manifesto_parcial.csv');
// confere que cada linha do manifesto tem arquivo e que cada PNG tem linha
const pngs = fs.readdirSync('capturas').filter((f) => f.endsWith('.png'));
const faltaLinha = pngs.filter((f) => !todas.some((m) => m.arquivo === f));
const faltaArquivo = todas.filter((m) => !fs.existsSync('capturas/' + m.arquivo)).map((m) => m.arquivo);
console.log(`${todas.length} linhas no manifesto; ${pngs.length} PNG; PNG sem linha: ${faltaLinha.join(', ') || 'nenhum'}; linha sem arquivo: ${faltaArquivo.join(', ') || 'nenhuma'}`);
