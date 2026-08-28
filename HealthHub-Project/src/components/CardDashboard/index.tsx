import {
  IconAlertTriangle,
  IconDroplet,
  IconHeartRateMonitor,
  IconTemperature,
  IconChecks,
} from '@tabler/icons-react';
import { Box, Group, Paper, SimpleGrid, ThemeIcon, Text } from '@mantine/core';
import type { Patient } from '../../types/patient';

interface CardDashboardProps {
  patient: Patient | null;
}

export const CardDashboard = ({ patient }: CardDashboardProps) => {
  const currentVitals = patient?.sinaisVitais?.[0];
  const hasVitals = !!currentVitals?.created_at;

  const spo2 = Number(currentVitals?.saturacao_oxigenio);
  const bpm = Number(currentVitals?.frequencia_cardiaca);
  const isHypoxic = hasVitals && spo2 < 92;
  const isTachycardic = hasVitals && bpm > 100;
  const isCritical = isHypoxic || isTachycardic;

  const NAVY = 'oklch(0.24 0.02 240)';

  const stats = [
    {
      label: 'Saturação',
      value: currentVitals?.saturacao_oxigenio ? `${currentVitals.saturacao_oxigenio}%` : '--',
      icon: IconDroplet,
      color: isHypoxic ? 'red' : 'slate',
      accentColor: isHypoxic ? 'var(--mantine-color-red-5)' : NAVY,
    },
    {
      label: 'Freq. Cardíaca',
      value: currentVitals?.frequencia_cardiaca || '--',
      unit: 'bpm',
      icon: IconHeartRateMonitor,
      color: isTachycardic ? 'red' : 'slate',
      accentColor: isTachycardic ? 'var(--mantine-color-red-5)' : NAVY,
    },
    {
      label: 'Temperatura',
      value: currentVitals?.temperatura ? `${currentVitals.temperatura}` : '--',
      unit: '°C',
      icon: IconTemperature,
      color: 'slate',
      accentColor: NAVY,
    },
    {
      label: 'Status Geral',
      value: !patient ? '--' : !hasVitals ? 'Sem Dados' : isCritical ? 'Crítico' : 'Estável',
      icon: !hasVitals || isCritical ? IconAlertTriangle : IconChecks,
      color: isCritical ? 'red' : 'slate',
      accentColor: isCritical ? 'var(--mantine-color-red-5)' : NAVY,
    },
  ];

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
      {stats.map((stat) => (
        <Paper
          key={stat.label}
          radius="md"
          style={{
            overflow: 'hidden',
            minHeight: 120,
            border: '1px solid oklch(0.90 0.01 220)',
            backgroundColor: '#fff',
          }}
        >
          <Box
            style={{
              height: 3,
              borderLeft: `3px solid ${stat.accentColor}`,
              backgroundColor: stat.accentColor,
            }}
          />
          <Box p="md">
            <Group justify="space-between" mb="xs">
              <Text
                fw={600}
                tt="uppercase"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  letterSpacing: '0.10em',
                  color: 'oklch(0.60 0.02 240)',
                }}
              >
                {stat.label}
              </Text>
              <ThemeIcon size="sm" radius="md" color={stat.color} variant="light">
                <stat.icon size={14} stroke={2} />
              </ThemeIcon>
            </Group>
            <Group align="baseline" gap={4}>
              <Text
                fw={800}
                lh={1}
                style={{ fontSize: '2.2rem', color: 'oklch(0.24 0.02 240)' }}
              >
                {stat.value}
              </Text>
              {stat.unit && (
                <Text size="xs" fw={500} c="slate.4" tt="uppercase">
                  {stat.unit}
                </Text>
              )}
            </Group>
          </Box>
        </Paper>
      ))}
    </SimpleGrid>
  );
};
