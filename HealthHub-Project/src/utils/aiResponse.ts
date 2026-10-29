// Isola a leitura da resposta da IA do resto da tela: se o formato vier
// inesperado (campo ausente, tipo errado, corpo vazio), devolve um erro
// tratável em vez de deixar o chat simplesmente não reagir.
export type AiReplyResult = { ok: true; reply: string } | { ok: false; error: string };

export function parseAiReply(data: unknown): AiReplyResult {
  const reply = (data as { reply?: unknown } | null | undefined)?.reply;

  if (typeof reply === 'string' && reply.trim().length > 0) {
    return { ok: true, reply };
  }

  return { ok: false, error: 'Resposta da IA em formato inesperado. Tente novamente.' };
}
