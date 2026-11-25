// Defesa do histórico da conversa (rodada 5, continuação): NENHUMA mensagem de `history` enviada à Groq pode trazer o nome do paciente, a não ser
// o que o próprio profissional digitou no texto livre (papel "user", que segue como foi digitado). Funções puras.
import type { ChatMessage } from './clinical-chat.service';

// A tela abre a conversa com "Olá! Analisando **<nome>**. Como posso ajudar neste caso?". Essa saudação é só da tela e nunca deve ir à IA.
const SAUDACAO_INICIAL = /^\s*Olá!\s*Analisando\s[\s\S]*?\.\s*Como posso ajudar neste caso\?\s*$/i;

export const ehSaudacaoInicial = (texto: unknown): boolean => typeof texto === 'string' && SAUDACAO_INICIAL.test(texto);

const simplificar = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Nome completo do paciente SE o cliente o enviou no patientContext (`nome_completo` ou `nome`); a tela atual não envia. */
export function nomeDoContexto(ctx: unknown): string | null {
  const c = ctx as { nome_completo?: unknown; nome?: unknown } | null | undefined;
  const n = c?.nome_completo ?? c?.nome;
  return typeof n === 'string' && n.trim().length >= 3 ? n.trim() : null;
}

/**
 * Descarta do histórico (a) mensagens do assistente que casam com a saudação inicial e (b) mensagens do assistente que contêm o nome completo do
 * paciente (sem diferenciar caixa nem acentos), quando o nome é conhecido. Mensagens do usuário e demais mensagens do assistente passam intactas.
 */
export function filtrarHistorico(history: ChatMessage[] | undefined | null, nomePaciente: string | null): ChatMessage[] {
  const nome = nomePaciente ? simplificar(nomePaciente) : null;
  return (history || []).filter((m) => {
    if (!m || m.role !== 'assistant' || typeof m.content !== 'string') return true;
    if (ehSaudacaoInicial(m.content)) return false;
    if (nome && simplificar(m.content).includes(nome)) return false;
    return true;
  });
}
