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
        style={{ borderBottom: '1px solid oklch(0.90 0.01 220)', flexShrink: 0 }}
      >
        <Box
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
          }}
        >
          <Stack gap={4}>
            <Title
              order={titleOrder}
              fw={800}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: 'oklch(0.24 0.02 240)',
              }}
            >
              {/* Hub-blue accent dot */}
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: 'oklch(0.52 0.14 235)',
                  flexShrink: 0,
                  marginBottom: 2,
                }}
              />
              {icon}
              {title}
            </Title>
            {description && (
              <Text
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  color: 'oklch(0.58 0.02 240)',
                }}
              >
                {description}
              </Text>
            )}
          </Stack>
          {actions}
        </Box>
      </Box>
      <Box
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
