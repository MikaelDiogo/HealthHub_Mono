import type { ChatMessage, PatientContext } from '../application/clinical-chat.service';

export const AI_CHAT_PROVIDER = 'AI_CHAT_PROVIDER';

export interface AiChatReply {
  reply: string;
  source: string;
}

/**
 * Contrato comum para qualquer provedor de IA do chat clínico (Groq hoje;
 * Claude via API no futuro, mediante confirmação — ver eval/README.md).
 * Trocar de provedor é implementar isto e trocar o `useClass` no AiModule.
 */
export interface IAiChatProvider {
  execute(message: string, patientContext: PatientContext, history?: ChatMessage[]): Promise<AiChatReply>;
}
