export interface SinalVital {
  id: string;
  temperatura: string;
  pressao_arterial: string;
  frequencia_cardiaca: string;
  saturacao_oxigenio: string;
  created_at: string;
}

export interface Patient {
  id: string;
  nome_completo: string;
  /** Verdadeiro quando o nome foi gerado pelo sistema (paciente ainda não identificado). */
  nome_provisorio?: boolean;
  // Só o nome é obrigatório no cadastro: os demais campos podem vir nulos.
  idade?: number | null;
  sexo?: string | null;
  cpf?: string | null;
  rg?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  alergias?: string | null;
  medicamentos_em_uso?: string | null;
  anamnese?: string | null;
  ativo?: boolean;
  sinaisVitais?: SinalVital[];
}
