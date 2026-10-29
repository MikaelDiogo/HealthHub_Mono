import { useEffect, useState, useMemo } from 'react';
import { Paper, Title, Box, Text, Group, Stack, Skeleton } from '@mantine/core';
import { LineChart } from '@mantine/charts';
import { EmptyState, ErrorState } from '../ui';
import api from '../../services/api';

interface HistoryChartProps {
  patientId: string | number;
  patientName: string;
  refreshKey?: number; // incrementar para forçar refetch após salvar sinais
}

interface VitalRecord {
  id: string;
  frequencia_cardiaca: string | number;
  saturacao_oxigenio: string | number;
  temperatura: string | number;
  created_at: string | Date;
}

export const HistoryChart = ({ patientId, patientName, refreshKey = 0 }: HistoryChartProps) => {
  const [rawData, setRawData] = useState<VitalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    async function fetchVitalsHistory() {
      if (!patientId) return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
      setLoading(true);
      setError(false);
      try {
        const response = await api.get(`/patients/${patientId}/vitals`);
        setRawData(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Erro ao carregar histórico vital:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchVitalsHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, refreshKey, tentativa]);

  const chartData = useMemo(
    () =>
      [...rawData]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((item) => {
          const bpm = parseFloat(String(item.frequencia_cardiaca));
          const spo2 = parseFloat(String(item.saturacao_oxigenio));
          const temp = parseFloat(String(item.temperatura));
          // Leituras de outro dia levam a data junto, para o eixo não misturar dias só pela hora
          const quando = new Date(item.created_at);
          const hoje = new Date().toDateString() === quando.toDateString();
          const hhmm = quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          return {
            hora: hoje ? hhmm : `${quando.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${hhmm}`,
            BPM: bpm > 0 ? bpm : null,
            SpO2: spo2 > 0 ? spo2 : null,
            Temp: temp > 0 ? temp : null,
          };
        }),
    [rawData],
  );

  return (
    <Paper p={20} withBorder style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Group justify="space-between" mb="lg" wrap="nowrap">
        <Stack gap={2}>
          <Title order={2} size={16} fw={600} c="var(--hh-ink)">
            Histórico de sinais vitais
          </Title>
          <Text size="sm" c="var(--hh-muted)">
            Paciente: <Text span fw={500} c="var(--hh-ink)" inherit>{patientName || '—'}</Text>
          </Text>
        </Stack>
        {chartData.length > 0 && (
          <Text size="sm" c="var(--hh-muted)">
            {chartData.length} {chartData.length === 1 ? 'leitura' : 'leituras'}
          </Text>
        )}
      </Group>

      <Box style={{ flex: 1, minHeight: 0 }}>
        {loading ? (
          <Skeleton h="100%" mih={160} />
        ) : error ? (
          <ErrorState message="Não foi possível carregar o histórico de sinais vitais." onRetry={() => setTentativa((t) => t + 1)} />
        ) : chartData.length === 0 ? (
          <EmptyState message="Nenhuma leitura de sinais vitais registrada para este prontuário." />
        ) : (
          <LineChart
            h="100%"
            data={chartData}
            dataKey="hora"
            withLegend
            legendProps={{ verticalAlign: 'bottom', height: 30 }}
            series={[
              { name: 'BPM', color: 'red.5', label: 'Frequência cardíaca (bpm)' },
              { name: 'SpO2', color: 'cyan.6', label: 'Saturação (SpO₂ %)' },
              { name: 'Temp', color: 'orange.5', label: 'Temperatura (°C)' },
            ]}
            // Segmentos retos: uma curva suavizada inventaria valores entre as leituras
            curveType="linear"
            tickLine="none"
            gridAxis="x"
            strokeWidth={2}
            withDots={false}
          />
        )}
      </Box>
    </Paper>
  );
};
