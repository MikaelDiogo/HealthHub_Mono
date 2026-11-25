// Monta o `history` enviado ao backend (e dele à Groq). Mensagens marcadas como `local` (a saudação "Olá! Analisando <nome do paciente>...", que só existe
// na tela) NUNCA entram no histórico: o nome do paciente não pode ir à IA por esse caminho. As demais seguem como antes: as últimas 4, com o papel convertido.
export interface MensagemDoChat { sender: 'user' | 'ai'; text: string; local?: boolean }

export function montarHistorico(mensagens: MensagemDoChat[], limite = 4): Array<{ role: 'user' | 'assistant'; content: string }> {
  return mensagens
    .filter((m) => !m.local)
    .slice(-limite)
    .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));
}
