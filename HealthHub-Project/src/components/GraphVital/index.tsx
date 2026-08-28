import { useEffect, useState, useMemo } from 'react';
import { Paper, Title, Box, Center, Loader, Text, Group, Badge, Stack, ThemeIcon } from '@mantine/core';
import { LineChart } from '@mantine/charts';
import { IconActivity, IconAlertCircle, IconTimeline } from '@tabler/icons-react';
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
  }, [patientId, refreshKey]);

  const chartData = useMemo(
    () =>
      [...rawData]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((item) => {
          const bpm = parseFloat(String(item.frequencia_cardiaca));
          const spo2 = parseFloat(String(item.saturacao_oxigenio));
          const temp = parseFloat(String(item.temperatura));
          return {
            hora: new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            BPM: bpm > 0 ? bpm : null,
            SpO2: spo2 > 0 ? spo2 : null,
            Temp: temp > 0 ? temp : null,
          };
        }),
    [rawData],
  );

  return (
    <Paper p="xl" radius="md" withBorder style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Group justify="space-between" mb="xl">
        <Stack gap={2}>
          <Group gap="xs">
            <IconTimeline size={18} />
            <Title order={4} c="slate.9">
              Histórico de Sinais Vitais
            </Title>
          </Group>
          <Text size="xs" c="slate.5">
            Linha temporal de: <Text span fw={600} c="slate.7" inherit>{patientName}</Text>
          </Text>
        </Stack>
        {chartData.length > 0 && (
          <Badge color="slate" variant="light">
            {chartData.length} amostras
          </Badge>
        )}
      </Group>

      <Box style={{ flex: 1, minHeight: 0 }}>
        {loading ? (
          <Center h="100%">
            <Loader size="sm" color="slate" />
          </Center>
        ) : error ? (
          <Center h="100%">
            <Stack align="center" gap={6}>
              <ThemeIcon color="red" variant="light" size="xl">
                <IconAlertCircle size={24} />
              </ThemeIcon>
              <Text size="xs" c="red" fw={600}>
                Erro ao carregar telemetria
              </Text>
            </Stack>
          </Center>
        ) : chartData.length === 0 ? (
          <Center h="100%">
            <Stack align="center" gap={6}>
              <IconActivity size={28} color="var(--mantine-color-slate-3)" />
              <Text size="xs" c="slate.5">
                Nenhuma leitura para este prontuário.
              </Text>
            </Stack>
          </Center>
        ) : (
          <LineChart
            h="100%"
            data={chartData}
            dataKey="hora"
            withLegend
            legendProps={{ verticalAlign: 'bottom', height: 30 }}
            series={[
              { name: 'BPM', color: 'red.5', label: 'Frequência Cardíaca (BPM)' },
              { name: 'SpO2', color: 'cyan.6', label: 'Saturação (SpO2 %)' },
              { name: 'Temp', color: 'orange.5', label: 'Temperatura (°C)' },
            ]}
            curveType="monotone"
            tickLine="none"
            gridAxis="xy"
            strokeWidth={2.5}
            withDots={chartData.length < 45}
          />
        )}
      </Box>
    </Paper>
  );
};
