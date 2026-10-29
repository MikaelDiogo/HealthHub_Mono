import { Inject, Injectable } from '@nestjs/common';
import { AI_CHAT_PROVIDER, IAiChatProvider } from '../domain/ai-chat-provider.interface';

export interface PatientContext {
  nome?: string;
  alergias?: string;
  medicamentos?: string;
  anamnese?: string;
  sinaisVitais?: {
    temperatura?: number;
    saturacao_oxigenio?: number;
    pressao_arterial?: string;
    frequencia_cardiaca?: number;
  };
}

export interface ChatMessage {
  role: string;
  content: string;
}

@Injectable()
export class ClinicalChatService {
  constructor(
    @Inject(AI_CHAT_PROVIDER)
    private readonly provider: IAiChatProvider,
  ) {}

  execute(message: string, patientContext: PatientContext, history: ChatMessage[] = []) {
    return this.provider.execute(message, patientContext, history);
  }
}
