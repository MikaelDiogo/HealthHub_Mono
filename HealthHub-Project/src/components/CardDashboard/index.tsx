import { IconAlertTriangle, IconDroplet, IconHeartRateMonitor, IconTemperature, IconChecks } from '@tabler/icons-react';
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

  const stats = [
    {
      label: 'Saturação',
      value: currentVitals?.saturacao_oxigenio ? `${currentVitals.saturacao_oxigenio}%` : '--',
      icon: IconDroplet,
      color: isHypoxic ? 'red' : 'teal',
    },
    {
      label: 'Freq. Cardíaca',
      value: currentVitals?.frequencia_cardiaca || '--',
      unit: 'bpm',
      icon: IconHeartRateMonitor,
      color: isTachycardic ? 'red' : 'cyan',
    },
    {
      label: 'Temperatura',
      value: currentVitals?.temperatura ? `${currentVitals.temperatura}` : '--',
      unit: '°C',
      icon: IconTemperature,
      color: 'yellow',
    },
    {
      label: 'Status Geral',
      value: !patient ? '--' : !hasVitals ? 'Sem Dados' : isCritical ? 'Crítico' : 'Estável',
      icon: !hasVitals || isCritical ? IconAlertTriangle : IconChecks,
      color: !hasVitals ? 'slate' : isCritical ? 'red' : 'teal',
    },
  ];

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
      {stats.map((stat) => (
        <Paper key={stat.label} radius="md" withBorder style={{ overflow: 'hidden', minHeight: 120 }}>
          <Box style={{ height: 3, backgroundColor: `var(--mantine-color-${stat.color}-5)` }} />
          <Box p="md">
            <Group justify="space-between" mb="xs">
              <Text size="xs" fw={600} tt="uppercase" c="slate.4" lts={0.8}>
                {stat.label}
              </Text>
              <ThemeIcon size="sm" radius="md" color={stat.color} variant="light">
                <stat.icon size={14} stroke={2} />
              </ThemeIcon>
            </Group>
            <Group align="baseline" gap={4}>
              <Text size="2rem" fw={500} c="slate.8" lh={1}>
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
