import { Paper, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconUser } from '@tabler/icons-react';
import type { Patient } from '../../types/patient';

interface PatientSidebarCardProps {
  patient: Patient;
  isActive: boolean;
  onClick: () => void;
}

export function PatientSidebarCard({ patient, isActive, onClick }: PatientSidebarCardProps) {
  return (
    <Paper
      withBorder
      p="sm"
      radius="md"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        width: '100%',
        backgroundColor: isActive ? 'oklch(0.95 0.04 235)' : '#fff',
        borderColor: isActive ? 'oklch(0.52 0.14 235)' : 'oklch(0.90 0.01 220)',
        borderLeft: isActive ? '3px solid oklch(0.52 0.14 235)' : '3px solid transparent',
        boxShadow: isActive ? 'var(--mantine-shadow-sm)' : undefined,
      }}
    >
      <Group wrap="nowrap" gap="sm">
        <ThemeIcon
          size="lg"
          radius="md"
          variant={isActive ? 'light' : 'default'}
          color={isActive ? 'hub' : 'slate'}
        >
          <IconUser size={18} stroke={2} />
        </ThemeIcon>

        <Stack gap={0} style={{ flex: 1, overflow: 'hidden' }}>
          <Text
            size="sm"
            fw={700}
            truncate
            lh={1.2}
            style={{ color: isActive ? 'oklch(0.24 0.02 240)' : 'var(--mantine-color-slate-7)' }}
          >
            {patient.nome_completo}
          </Text>
          <Group gap={6} mt={3}>
            <Text size="11px" fw={500} c={isActive ? 'slate.6' : 'slate.5'}>
              {patient.idade ? `${patient.idade} anos` : '-- anos'}
            </Text>
            <Text size="11px" c={isActive ? 'slate.4' : 'slate.3'}>
              •
            </Text>
            <Text size="11px" fw={500} c={isActive ? 'slate.6' : 'slate.5'} tt="capitalize">
              {patient.sexo || 'Não inf.'}
            </Text>
          </Group>
        </Stack>
      </Group>
    </Paper>
  );
}
