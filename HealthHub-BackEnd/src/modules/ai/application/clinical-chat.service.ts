import { Inject, Injectable } from '@nestjs/common';
import { AI_CHAT_PROVIDER, IAiChatProvider } from '../domain/ai-chat-provider.interface';
import { anexarConferencia, removerConferencia } from './cid10-extracao';
import { Cid10Service } from './cid10.service';

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
    private readonly cid10: Cid10Service = new Cid10Service(),
  ) {}

  async execute(message: string, patientContext: PatientContext, history: ChatMessage[] = []) {
    // O bloco de conferência de uma resposta anterior NÃO volta à Groq (a descrição oficial da tabela fica só no servidor e na tela).
    const semConferencia = (history || []).map((m) => (m && m.role === 'assistant' && typeof m.content === 'string' ? { ...m, content: removerConferencia(m.content) } : m));
    const resposta = await this.provider.execute(message, contextoSemIdentificacao(patientContext), semConferencia);
    // Erros do provedor (429, 500, 503) já saíram acima, inalterados. Se a tabela local falhar, a resposta do modelo segue sem o bloco.
    try {
      return { ...resposta, reply: anexarConferencia(resposta.reply, (c) => this.cid10.conferir(c)) };
    } catch (err) {
      console.error('[HealthHub Chat] Conferência de CID indisponível:', (err as Error).message);
      return resposta;
    }
  }
}
