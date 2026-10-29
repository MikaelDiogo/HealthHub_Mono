// Extrai uma mensagem legível do erro devolvido pela API (NestJS: { error } ou
// { message: string | string[] }), para mostrar ao usuário em vez de só logar no console.
const TRADUCAO: Record<string, string> = {
  Forbidden: 'Seu perfil não tem permissão para esta ação.',
  Unauthorized: 'Sessão expirada. Entre novamente.',
};

const NOMES_DE_STATUS = new Set(['Bad Request', 'Forbidden', 'Unauthorized', 'Not Found', 'Conflict', 'Internal Server Error']);

export function mensagemErro(err: unknown, padrao = 'Não foi possível concluir a ação. Tente de novo.'): string {
  const e = err as { response?: { status?: number; data?: { error?: string; message?: string | string[] } }; message?: string };
  const data = e?.response?.data;
  // NestJS: validação → { message: string[], error: 'Bad Request' }; exceção própria → { error: 'texto' }
  if (Array.isArray(data?.message) && data.message.length) return [...new Set(data.message)].join(' · ');
  if (typeof data?.error === 'string' && data.error && !NOMES_DE_STATUS.has(data.error)) return data.error;
  if (typeof data?.message === 'string' && data.message) return TRADUCAO[data.message] ?? data.message;
  if (e?.response?.status === 403) return TRADUCAO.Forbidden;
  if (e?.response?.status === 401) return TRADUCAO.Unauthorized;
  if (e?.message === 'Network Error') return 'Sem conexão com o servidor.';
  return padrao;
}
