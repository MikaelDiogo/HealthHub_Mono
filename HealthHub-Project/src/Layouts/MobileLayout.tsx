import { AppShell, Box, Group, Text } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roleLabel } from '../utils/roles';
import { HHMark } from '../components/ui';

export function MobileLayout() {
  const { role, nome } = useAuth();

  return (
    <AppShell
      header={{ height: 56 }}
      padding={0}
      styles={{
        main: {
          backgroundColor: 'var(--hh-ground)',
          height: '100dvh',
          overflow: 'hidden',
        },
        header: {
          backgroundColor: 'var(--hh-surface)',
          borderBottom: '1px solid var(--hh-border)',
        },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <HHMark size={28} />
            <Text fw={700} size="sm" c="var(--hh-ink)">HealthHub</Text>
            {role && <Text size="xs" c="var(--hh-muted)">{roleLabel(role)}</Text>}
          </Group>
          <Text size="xs" c="var(--hh-muted)" truncate maw={140}>{nome}</Text>
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
