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
  idade: number;
  sexo: string;
  cpf: string;
  rg: string;
  telefone: string;
  endereco: string;
  alergias: string;
  medicamentos_em_uso: string;
  anamnese: string;
  sinaisVitais?: SinalVital[];
}
