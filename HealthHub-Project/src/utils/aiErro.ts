// Mensagem mostrada ao usuário quando o assistente de IA falha. Só o HTTP 429 (limite de requisições do provedor) mostra a mensagem
// enviada pelo backend; qualquer outra falha (500, 503, rede, resposta sem corpo) mantém o texto genérico de sempre.
export const ERRO_GENERICO_IA = 'Erro ao conectar com o assistente.';

export function mensagemDeErroDaIa(err: unknown): string {
  const resposta = (err as { response?: { status?: unknown; data?: { message?: unknown } } } | null | undefined)?.response;
  const mensagem = resposta?.data?.message;
  if (resposta?.status === 429 && typeof mensagem === 'string' && mensagem.trim() !== '') return mensagem;
  return ERRO_GENERICO_IA;
}

export const ehLimiteDaIa = (err: unknown): boolean =>
  (err as { response?: { status?: unknown } } | null | undefined)?.response?.status === 429;
