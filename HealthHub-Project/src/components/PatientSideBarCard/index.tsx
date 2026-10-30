import { Group, Stack, Text, UnstyledButton } from '@mantine/core';
import type { Patient } from '../../types/patient';

interface PatientSidebarCardProps {
  patient: Patient;
  isActive: boolean;
  onClick: () => void;
  /** Cor da classificação de risco (riscoCSSColor). Cinza se ainda não classificado. */
  dotColor?: string;
}

// Linha de lista selecionável. O ponto à esquerda é a categoria de risco (dado);
// a seleção usa o tom neutro de "ativo", nunca um preenchimento escuro.
export function PatientSidebarCard({ patient, isActive, onClick, dotColor }: PatientSidebarCardProps) {
  return (
    <UnstyledButton
      onClick={onClick}
      aria-pressed={isActive}
      w="100%"
      px="sm"
      py={8}
      style={{
        borderRadius: 'var(--hh-radius-control)',
        border: `1px solid ${isActive ? 'var(--hh-control)' : 'transparent'}`,
        backgroundColor: isActive ? 'var(--hh-active)' : 'transparent',
        transition: 'background-color 120ms ease',
      }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--hh-raised)'; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      <Group wrap="nowrap" gap={10}>
        <span
          aria-hidden
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            flexShrink: 0,
            background: dotColor ?? 'var(--hh-control)',
          }}
        />
        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={isActive ? 600 : 500} truncate lh={1.3} c="var(--hh-ink)">
            {patient.nome_completo}
          </Text>
          <Text size="xs" c="var(--hh-muted)">
            {patient.idade ? `${patient.idade} anos` : '—'} · {patient.sexo || '—'}
          </Text>
        </Stack>
      </Group>
    </UnstyledButton>
  );
}
