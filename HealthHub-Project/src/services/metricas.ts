import api from './api';

export type Etapa =
  | 'Aguardando Triagem'
  | 'Em Triagem (Enfermeiro)'
  | 'Aguardando Atendimento'
  | 'Em Consulta (Médico)'
  | 'Em Observação';

export interface Metricas {
  geradoEm: string;
  esteira: {
    total: number;
    porEtapa: Record<Etapa, number>;
    porRisco: Record<string, number>;
    maiorEspera: { minutos: number; nome: string; paciente_id: string } | null;
    esperaMediaMin: number | null;
  };
  hoje: { chegadas: number; altas: number };
  periodo30d: {
    chegadas: number;
    encerradas: number;
    permanenciaMediaMin: number | null;
    permanenciaMedianaMin: number | null;
    readmissoes: number;
    taxaReadmissao: number;
    desfechos: Record<string, number>;
    risco: Record<string, number>;
  };
  serie30d: { dia: string; rotulo: string; chegadas: number; altas: number }[];
  atencao: { paciente_id: string; nome: string; motivo: string; nivel: 'critico' | 'espera'; esperaMin?: number }[];
}

export interface ResumoHistorico {
  paciente_id: string;
  total: number;
  ultima: {
    chegada: string;
    alta: string | null;
    desfecho: string;
    gravidade_manchester: string | null;
    motivo_visita: string | null;
  };
}

export const buscarMetricas = () => api.get<Metricas>('/metricas').then((r) => r.data);
export const buscarHistoricoPacientes = () =>
  api.get<Record<string, ResumoHistorico>>('/metricas/historico-pacientes').then((r) => r.data);

/** 42 min · 3 h 20 min · 26 d 12 h — sempre a unidade que se lê de relance. */
export function formatDuracao(min: number | null | undefined): string {
  if (min === null || min === undefined) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return min % 60 ? `${h} h ${min % 60} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d} d ${h % 24} h` : `${d} d`;
}

export function formatPct(fracao: number): string {
  return `${(fracao * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

export function formatDataCurta(iso: string | Date): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', year: 'numeric' });
}

/** "há 3 dias", "há 2 meses" — recência em palavras. */
export function tempoAtras(iso: string | Date, agora = new Date()): string {
  const dias = Math.floor((agora.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? 'há 1 mês' : `há ${meses} meses`;
}

export function ordinal(n: number): string {
  return `${n}ª`;
}
