import { Box, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconUser } from '@tabler/icons-react';
import type { Patient } from '../../types/patient';

interface PatientSidebarCardProps {
  patient: Patient;
  isActive: boolean;
  onClick: () => void;
}

export function PatientSidebarCard({ patient, isActive, onClick }: PatientSidebarCardProps) {
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
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = 'var(--mantine-color-slate-0)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = '#fff';
      }}
    >
      <Group wrap="nowrap" gap="sm">
        <Box
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: isActive ? 'rgba(255,255,255,0.15)' : 'var(--mantine-color-slate-1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: isActive ? '#fff' : 'var(--mantine-color-slate-5)',
          }}
        >
          <IconUser size={16} stroke={2} />
        </Box>

        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text
            size="sm"
            fw={700}
            truncate
            lh={1.2}
            style={{ color: isActive ? '#fff' : 'var(--mantine-color-slate-8)' }}
          >
            {patient.nome_completo}
          </Text>
          <Text
            size="11px"
            style={{ color: isActive ? 'rgba(255,255,255,0.6)' : 'var(--mantine-color-slate-5)' }}
          >
            {patient.idade ? `${patient.idade} anos` : '--'} · {patient.sexo || '—'}
          </Text>
        </Stack>
      </Group>
    </UnstyledButton>
  );
}
