import {
  IconAlertTriangle, IconDroplet, IconHeartRateMonitor, IconTemperature, IconChecks,
} from '@tabler/icons-react';
import { Box, Group, Paper, SimpleGrid, ThemeIcon, Text } from '@mantine/core';
import type { Patient } from '../../types/patient';
import { spo2Status, fcStatus, tempStatus, getStatusCSSColor } from '../../utils/vitalStatus';

interface CardDashboardProps {
  patient: Patient | null;
}

export const CardDashboard = ({ patient }: CardDashboardProps) => {
  const v = patient?.sinaisVitais?.[0];

  const spo2     = Number(v?.saturacao_oxigenio ?? 0);
  const fc       = Number(v?.frequencia_cardiaca ?? 0);
  const temp     = Number(v?.temperatura ?? 0);

  const sSpo2    = spo2Status(spo2);
  const sFc      = fcStatus(fc);
  const sTemp    = tempStatus(temp);
  const sCritical = sSpo2 === 'critical' || sFc === 'critical' || sTemp === 'critical';
  const sWarning  = sSpo2 === 'warning'  || sFc === 'warning'  || sTemp === 'warning';
  const sStatus   = !v ? 'unknown' : sCritical ? 'critical' : sWarning ? 'warning' : 'normal';

  // Contorno do card = cor exata da bolinha/série daquela métrica no GraphVital.
  // Status Geral = cor da gravidade agregada a partir das outras métricas.
  const stats = [
    {
      label: 'Saturação',
      value: v?.saturacao_oxigenio ? `${v.saturacao_oxigenio}%` : '--',
      icon: IconDroplet,
      iconColor: sSpo2 === 'unknown' ? 'slate' : 'cyan',
      // Série SpO2 no GraphVital: cyan.6
      accentColor: sSpo2 === 'unknown' ? 'var(--mantine-color-slate-4)' : 'var(--mantine-color-cyan-6)',
    },
    {
      label: 'Freq. Cardíaca',
      value: v?.frequencia_cardiaca || '--',
      unit: 'bpm',
      icon: IconHeartRateMonitor,
      iconColor: sFc === 'unknown' ? 'slate' : 'red',
      // Série BPM no GraphVital: red.5
      accentColor: sFc === 'unknown' ? 'var(--mantine-color-slate-4)' : 'var(--mantine-color-red-5)',
    },
    {
      label: 'Temperatura',
      value: v?.temperatura ? `${v.temperatura}` : '--',
      unit: '°C',
      icon: IconTemperature,
      iconColor: sTemp === 'unknown' ? 'slate' : 'orange',
      // Série Temp no GraphVital: orange.5
      accentColor: sTemp === 'unknown' ? 'var(--mantine-color-slate-4)' : 'var(--mantine-color-orange-5)',
    },
    {
      label: 'Status Geral',
      value: !patient ? '--' : !v ? 'Sem Dados' : sCritical ? 'Crítico' : sWarning ? 'Atenção' : 'Estável',
      icon: !v || sCritical ? IconAlertTriangle : IconChecks,
      iconColor: sStatus === 'critical' ? 'red' : sStatus === 'warning' ? 'yellow' : sStatus === 'normal' ? 'green' : 'slate',
      // Gravidade agregada (pior status entre SpO2, FC e Temp)
      accentColor: getStatusCSSColor(sStatus),
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
            // Borda translúcida na cor da métrica + glow difuso sutil + leve tint no fundo
            border: `1px solid color-mix(in srgb, ${stat.accentColor} 45%, transparent)`,
            boxShadow: `0 0 0 3px color-mix(in srgb, ${stat.accentColor} 9%, transparent), 0 4px 16px color-mix(in srgb, ${stat.accentColor} 12%, transparent)`,
            backgroundColor: `color-mix(in srgb, ${stat.accentColor} 5%, #fff)`,
          }}
        >
          <Box p="md">
            <Group justify="space-between" mb="xs">
              <Text fw={600} tt="uppercase" style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10, letterSpacing: '0.10em', color: 'oklch(0.60 0.02 240)',
              }}>
                {stat.label}
              </Text>
              <ThemeIcon size="sm" radius="md" color={stat.iconColor} variant="light">
                <stat.icon size={14} stroke={2} />
              </ThemeIcon>
            </Group>
            <Group align="baseline" gap={4}>
              <Text fw={800} lh={1} style={{ fontSize: '2.2rem', color: 'oklch(0.24 0.02 240)' }}>
                {stat.value}
              </Text>
              {stat.unit && (
                <Text size="xs" fw={500} c="slate.4" tt="uppercase">{stat.unit}</Text>
              )}
            </Group>
          </Box>
        </Paper>
      ))}
    </SimpleGrid>
  );
};
