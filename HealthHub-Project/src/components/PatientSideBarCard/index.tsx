import { Box, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconUser } from '@tabler/icons-react';
import type { Patient } from '../../types/patient';

interface PatientSidebarCardProps {
  patient: Patient;
  isActive: boolean;
  onClick: () => void;
  /** Cor da bolinha — cor Manchester da triagem (manchesterCSSColor). Cinza se não triado. */
  dotColor?: string;
}

function getInitials(name: string) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export function PatientSidebarCard({ patient, isActive, onClick, dotColor = 'var(--mantine-color-slate-3)' }: PatientSidebarCardProps) {
  const showDot = dotColor !== 'var(--mantine-color-slate-3)';

  return (
    <UnstyledButton
      onClick={onClick}
      w="100%"
      p="sm"
      style={{
        borderRadius: 10,
        border: isActive
          ? '1.5px solid var(--mantine-color-slate-7)'
          : '1.5px solid var(--mantine-color-slate-2)',
        backgroundColor: isActive ? 'var(--mantine-color-slate-8)' : '#fff',
        transition: 'all 120ms ease',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--mantine-color-slate-0)'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = '#fff'; }}
    >
      <Group wrap="nowrap" gap="sm">
        {/* Ícone de paciente */}
        <Box
          style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            background: isActive ? 'rgba(255,255,255,0.15)' : 'var(--mantine-color-slate-1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isActive ? '#fff' : 'var(--mantine-color-slate-5)',
            position: 'relative',
          }}
        >
          <IconUser size={16} stroke={2} />
          {/* Bolinha Manchester — só aparece se triagem definida */}
          {showDot && (
            <Box
              style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 10, height: 10, borderRadius: '50%',
                backgroundColor: dotColor,
                border: `2px solid ${isActive ? 'var(--mantine-color-slate-8)' : '#fff'}`,
              }}
            />
          )}
        </Box>

        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={700} truncate lh={1.2}
            style={{ color: isActive ? '#fff' : 'var(--mantine-color-slate-8)' }}>
            {patient.nome_completo}
          </Text>
          <Text size="11px"
            style={{ color: isActive ? 'rgba(255,255,255,0.6)' : 'var(--mantine-color-slate-5)' }}>
            {patient.idade ? `${patient.idade} anos` : '--'} · {patient.sexo || '—'}
          </Text>
        </Stack>
      </Group>
    </UnstyledButton>
  );
}
