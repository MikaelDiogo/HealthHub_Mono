import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import type { Patient } from '../types/patient';
import { chatService } from '../services/chatService';
import { horarioBrasilia } from '../utils/datetime';

export type PatientStatus =
  | 'Aguardando Triagem'
  | 'Em Triagem (Enfermeiro)'
  | 'Aguardando Atendimento'
  | 'Em Consulta (Médico)'
  | 'Em Observação'
  | 'Alta';

export type Gravidade = 'Vermelho' | 'Laranja' | 'Amarelo' | 'Verde' | 'Azul';

export interface FilaPaciente {
  id: string;
  paciente_id: string;
  nome: string;
  idade: number;
  senha: string;
  chegada: string;
  status: PatientStatus;
  gravidade?: Gravidade;
  /** Momento real da admissão (base do tempo de espera ao vivo) */
  created_at?: string;
}

/** Próxima senha a partir das que já estão na esteira — não repete após recarregar a página. */
export function proximaSenha(fila: FilaPaciente[], prefixo = 'PR'): string {
  const maior = fila.reduce((max, f) => {
    const m = new RegExp(`^${prefixo}-(\\d+)$`).exec(f.senha ?? '');
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
  return `${prefixo}-${String(maior + 1).padStart(3, '0')}`;
}

interface CareContextValue {
  carePatients: FilaPaciente[];
  loading: boolean;
  admitirPaciente: (patient: Patient, senha: string, motivo?: string) => Promise<void>;
  avançarFluxo: (filaId: string, novoStatus: PatientStatus, gravidade?: Gravidade) => Promise<void>;
  removerPaciente: (filaId: string) => Promise<void>;
  isInObservation: (pacienteId: string) => boolean;
  recarregar: () => Promise<void>;
}

const CareContext = createContext<CareContextValue>({
  carePatients: [],
  loading: false,
  admitirPaciente: async () => {},
  avançarFluxo: async () => {},
  removerPaciente: async () => {},
  isInObservation: () => false,
  recarregar: async () => {},
});

export function CareProvider({ children }: { children: React.ReactNode }) {
  const [carePatients, setCarePatients] = useState<FilaPaciente[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get<FilaPaciente[]>('/fila');
      setCarePatients(res.data);
    } catch {
      // silencia — pode estar sem token no primeiro mount
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // Mantém a esteira sincronizada quando outra sessão altera a fila (triagem, alta, etc.)
    return chatService.onFilaChanged(() => { carregar(); });
  }, []);

  const admitirPaciente = async (patient: Patient, senha: string, motivo?: string) => {
    const body = {
      paciente_id: patient.id,
      nome: patient.nome_completo?.trim() || 'Paciente não identificado',
      idade: patient.idade ?? 0,
      senha,
      chegada: horarioBrasilia(),
      status: 'Aguardando Triagem',
      ...(motivo?.trim() ? { motivo_visita: motivo.trim() } : {}),
    };
    const res = await api.post<FilaPaciente>('/fila', body);
    setCarePatients((prev) => [...prev, res.data]);
  };

  const avançarFluxo = async (filaId: string, novoStatus: PatientStatus, gravidade?: Gravidade) => {
    if (novoStatus === 'Alta') {
      // Fecha a visita e inativa o paciente (some da listagem até ser resgatado)
      await api.patch(`/fila/${filaId}/alta`);
      setCarePatients((prev) => prev.filter((p) => p.id !== filaId));
      return;
    }
    const res = await api.put<FilaPaciente>(`/fila/${filaId}`, { status: novoStatus, gravidade });
    setCarePatients((prev) => prev.map((p) => (p.id === filaId ? res.data : p)));
  };

  const removerPaciente = async (filaId: string) => {
    await api.delete(`/fila/${filaId}`);
    setCarePatients((prev) => prev.filter((p) => p.id !== filaId));
  };

  const isInObservation = (pacienteId: string) =>
    carePatients.some((p) => p.paciente_id === pacienteId && p.status === 'Em Observação');

  return (
    <CareContext.Provider value={{
      carePatients,
      loading,
      admitirPaciente,
      avançarFluxo,
      removerPaciente,
      isInObservation,
      recarregar: carregar,
    }}>
      {children}
    </CareContext.Provider>
  );
}

export const useCare = () => useContext(CareContext);
