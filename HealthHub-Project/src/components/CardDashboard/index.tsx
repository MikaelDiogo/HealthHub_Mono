import { Box, Paper, Text } from '@mantine/core';
import type { Patient } from '../../types/patient';
import {
  spo2Status, fcStatus, tempStatus, getStatusCSSColor, type VitalStatus,
} from '../../utils/vitalStatus';

interface CardDashboardProps {
  patient: Patient | null;
}

const STATUS_TEXT: Record<VitalStatus, string> = {
  critical: 'Crítico',
  warning: 'Atenção',
  normal: 'Normal',
  unknown: '',
};

interface Kpi {
  label: string;
  value: string | null;
  unit?: string;
  status: VitalStatus;
}

// Faixa de KPIs: um contêiner dividido por linhas de 1px, número como tipografia.
// O estado aparece em texto + ponto (não só cor), e valor ausente é um traço cinza.
export const CardDashboard = ({ patient }: CardDashboardProps) => {
  const v = patient?.sinaisVitais?.[0];

  const spo2 = Number(v?.saturacao_oxigenio ?? 0);
  const fc = Number(v?.frequencia_cardiaca ?? 0);
  const temp = Number(v?.temperatura ?? 0);

  const sSpo2 = spo2Status(spo2);
  const sFc = fcStatus(fc);
  const sTemp = tempStatus(temp);
  const critical = [sSpo2, sFc, sTemp].includes('critical');
  const warning = [sSpo2, sFc, sTemp].includes('warning');
  const sGeral: VitalStatus = !v ? 'unknown' : critical ? 'critical' : warning ? 'warning' : 'normal';

  const kpis: Kpi[] = [
    { label: 'Saturação (SpO₂)', value: v?.saturacao_oxigenio ? `${v.saturacao_oxigenio}` : null, unit: '%', status: sSpo2 },
    { label: 'Frequência cardíaca', value: v?.frequencia_cardiaca ? `${v.frequencia_cardiaca}` : null, unit: 'bpm', status: sFc },
    { label: 'Temperatura', value: v?.temperatura ? `${v.temperatura}` : null, unit: '°C', status: sTemp },
    {
      label: 'Estado geral',
      value: !patient ? null : !v ? 'Sem dados' : critical ? 'Crítico' : warning ? 'Atenção' : 'Estável',
      status: sGeral,
    },
  ];

  return (
    <Paper withBorder style={{ overflow: 'hidden' }}>
      <Box
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 1,
          background: 'var(--hh-border)',
        }}
      >
        {kpis.map((kpi) => (
          <Box key={kpi.label} p="md" style={{ background: 'var(--hh-surface)' }}>
            <Text size="sm" c="var(--hh-muted)" mb={4}>{kpi.label}</Text>
            <Text component="div" lh={1.1} style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              {kpi.value === null ? (
                <span style={{ fontSize: 28, fontWeight: 600, color: 'var(--hh-faint)' }} aria-label="sem valor">—</span>
              ) : (
                <>
                  <span style={{ fontSize: 28, fontWeight: 600, color: 'var(--hh-ink)' }}>{kpi.value}</span>
                  {kpi.unit && <span style={{ fontSize: 14, color: 'var(--hh-muted)' }}>{kpi.unit}</span>}
                </>
              )}
            </Text>
            <Box mt={6} style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 18 }}>
              {kpi.status !== 'unknown' && (
                <>
                  <span
                    aria-hidden
                    style={{ width: 8, height: 8, borderRadius: '50%', background: getStatusCSSColor(kpi.status), flexShrink: 0 }}
                  />
                  <Text size="xs" c="var(--hh-muted)">{STATUS_TEXT[kpi.status]}</Text>
                </>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};
