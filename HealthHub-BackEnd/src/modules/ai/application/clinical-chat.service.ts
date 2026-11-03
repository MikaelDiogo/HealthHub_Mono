import { Inject, Injectable } from '@nestjs/common';
import { AI_CHAT_PROVIDER, IAiChatProvider } from '../domain/ai-chat-provider.interface';

export interface PatientContext {
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

/**
 * Repassa ao provedor SÓ os campos clínicos previstos. O nome do paciente (e qualquer outro campo, como
 * CPF, RG, telefone ou endereço) é descartado aqui, mesmo que o cliente o envie.
 */
export function contextoSemIdentificacao(ctx?: PatientContext | null): PatientContext {
  const c = ctx ?? {};
  const sv = c.sinaisVitais;
  return {
    alergias: c.alergias,
    medicamentos: c.medicamentos,
    anamnese: c.anamnese,
    sinaisVitais: sv
      ? { temperatura: sv.temperatura, saturacao_oxigenio: sv.saturacao_oxigenio, pressao_arterial: sv.pressao_arterial, frequencia_cardiaca: sv.frequencia_cardiaca }
      : undefined,
  };
}

@Injectable()
export class ClinicalChatService {
  constructor(
    @Inject(AI_CHAT_PROVIDER)
    private readonly provider: IAiChatProvider,
  ) {}

  execute(message: string, patientContext: PatientContext, history: ChatMessage[] = []) {
    return this.provider.execute(message, contextoSemIdentificacao(patientContext), history);
  }
}
