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
        backgroundColor: isActive ? 'var(--mantine-color-slate-8)' : '#fff',
        borderColor: isActive ? 'var(--mantine-color-slate-9)' : 'var(--mantine-color-slate-1)',
        boxShadow: isActive ? 'var(--mantine-shadow-sm)' : undefined,
      }}
    >
      <Group wrap="nowrap" gap="sm">
        <ThemeIcon
          size="lg"
          radius="md"
          variant={isActive ? 'light' : 'default'}
          color={isActive ? 'gray' : 'slate'}
        >
          <IconUser size={18} stroke={2} />
        </ThemeIcon>

        <Stack gap={0} style={{ flex: 1, overflow: 'hidden' }}>
          <Text size="sm" fw={700} truncate c={isActive ? 'white' : 'slate.7'} lh={1.2}>
            {patient.nome_completo}
          </Text>
          <Group gap={6} mt={3}>
            <Text size="11px" fw={500} c={isActive ? 'slate.4' : 'slate.5'}>
              {patient.idade ? `${patient.idade} anos` : '-- anos'}
            </Text>
            <Text size="11px" c={isActive ? 'slate.5' : 'slate.3'}>
              •
            </Text>
            <Text size="11px" fw={500} c={isActive ? 'slate.4' : 'slate.5'} tt="capitalize">
              {patient.sexo || 'Não inf.'}
            </Text>
          </Group>
        </Stack>
      </Group>
    </Paper>
  );
}
