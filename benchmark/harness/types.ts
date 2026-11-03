export interface Vinheta {
  id: string;
  vinheta: string;
  diagnostico_correto: string;
  urgente: 0 | 1;
  triagem_original?: string;
}

export interface ClassificacaoModelo {
  diagnoses: string[];
  urgency: 'urgent' | 'nonurgent';
}

export interface ResultadoClassificacao {
  /** undefined quando o formato veio inválido / não parseável */
  classificacao?: ClassificacaoModelo;
  tempo_ms: number;
  tokens_in?: number;
  tokens_out?: number;
  custo_usd?: number;
  formato_ok: boolean;
  erro?: string;
  /** 'infra' = falha de rede/processo (vale retry); 'formato' = modelo respondeu mas fora do formato (conta como erro, não repete). */
  tipo_erro?: 'infra' | 'formato';
}

export interface LinhaResultado {
  id: string;
  repeticao: number;
  diagnosticos_modelo: string;
  urgencia_modelo: string;
  gabarito: string;
  triagem_ok: '' | 'true' | 'false';
  formato_ok: 'true' | 'false';
  tempo_ms: number;
  tokens_in: number;
  tokens_out: number;
  custo_usd: number;
  dx_top3_ok: string; // sempre vazio — preenchimento manual
  erro: string;
}

/** Interface comum a todos os adaptadores de modelo — mesma assinatura para comparação justa. */
export interface ModelAdapter {
  nome: string;
  disponivel(): boolean;
  classificar(vinheta: Vinheta): Promise<ResultadoClassificacao>;
}
