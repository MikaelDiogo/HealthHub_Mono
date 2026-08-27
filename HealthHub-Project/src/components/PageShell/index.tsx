import { Box, Stack, Text, Title, type TitleOrder } from '@mantine/core';
import type { ReactNode } from 'react';

interface PageShellProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  titleOrder?: TitleOrder;
}

export function PageShell({
  title,
  description,
  icon,
  actions,
  children,
  titleOrder = 2,
}: PageShellProps) {
  return (
    <Box h="100%" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box
        pb="md"
        mb="lg"
        style={{ borderBottom: '1px solid var(--mantine-color-slate-2)', flexShrink: 0 }}
      >
        <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <Stack gap={4}>
            <Title order={titleOrder} c="slate.9" fw={600} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {icon}
              {title}
            </Title>
            {description && (
              <Text size="sm" c="slate.6">
                {description}
              </Text>
            )}
          </Stack>
          {actions}
        </Box>
      </Box>
      <Box style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>
    </Box>
  );
}
