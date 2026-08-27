import { AppShell, Box, Group, Text, Badge, ThemeIcon } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { IconHeartRateMonitor } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';

const ROLE_LABEL: Record<string, string> = {
  medico: 'Médico',
  enfermeiro: 'Enfermeiro',
  recepcionista: 'Recepcionista',
};

const ROLE_COLOR: Record<string, string> = {
  medico: 'teal',
  enfermeiro: 'blue',
  recepcionista: 'violet',
};

export function MobileLayout() {
  const { role, nome } = useAuth();
  const roleLabel = ROLE_LABEL[role ?? ''] ?? '';
  const roleColor = ROLE_COLOR[role ?? ''] ?? 'gray';

  return (
    <AppShell
      header={{ height: 56 }}
      padding={0}
      styles={{
        main: {
          backgroundColor: 'var(--mantine-color-slate-0)',
          height: '100dvh',
          overflow: 'hidden',
        },
        header: {
          backgroundColor: 'var(--mantine-color-slate-9)',
          borderBottom: 'none',
        },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <ThemeIcon color="teal" variant="light" size="sm" radius="sm">
              <IconHeartRateMonitor size={14} />
            </ThemeIcon>
            <Text fw={700} c="white" size="sm">HealthHub</Text>
            <Badge color={roleColor} size="xs" variant="light">{roleLabel}</Badge>
          </Group>
          <Text size="xs" c="slate.4" truncate maw={140}>{nome}</Text>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Box style={{ height: 'calc(100dvh - 56px)', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
