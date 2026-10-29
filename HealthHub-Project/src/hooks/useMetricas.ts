import { useCallback, useEffect, useState } from 'react';
import { chatService } from '../services/chatService';
import { buscarHistoricoPacientes, buscarMetricas, type Metricas, type ResumoHistorico } from '../services/metricas';

// Métricas do pronto-atendimento: recarrega quando a esteira muda (socket),
// quando sinais vitais são salvos e a cada minuto (as esperas crescem sozinhas).
export function useMetricas() {
  const [data, setData] = useState<Metricas | null>(null);
  const [error, setError] = useState(false);

  const recarregar = useCallback(async () => {
    try {
      setData(await buscarMetricas());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    recarregar();
    const timer = setInterval(recarregar, 60_000);
    const onVitals = () => { recarregar(); };
    window.addEventListener('vitals-updated', onVitals);
    const off = chatService.onFilaChanged(recarregar);
    return () => {
      clearInterval(timer);
      window.removeEventListener('vitals-updated', onVitals);
      off();
    };
  }, [recarregar]);

  return { data, error, loading: !data && !error, recarregar };
}

// Resumo do histórico por paciente (nº de visitas, última visita).
export function useHistoricoPacientes(ativo = true) {
  const [historico, setHistorico] = useState<Record<string, ResumoHistorico>>({});

  const recarregar = useCallback(async () => {
    try { setHistorico(await buscarHistoricoPacientes()); } catch { /* sem histórico: telas seguem funcionando */ }
  }, []);

  useEffect(() => {
    if (!ativo) return;
    recarregar();
    return chatService.onFilaChanged(recarregar);
  }, [ativo, recarregar]);

  return { historico, recarregar };
}

// Relógio que avança sozinho — base para esperas "ao vivo".
export function useAgora(intervaloMs = 30_000) {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), intervaloMs);
    return () => clearInterval(t);
  }, [intervaloMs]);
  return agora;
}
