import { Box, Stack, Text, Title, type TitleOrder } from '@mantine/core';
import type { ReactNode } from 'react';

interface PageShellProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  titleOrder?: TitleOrder;
  /** Conteúdo mais alto que a tela rola dentro da área (cabeçalho fica fixo) */
  scroll?: boolean;
}

// Cabeçalho padrão de tela: um substantivo como título (24px), uma linha de
// contexto em cinza e as ações reais à direita.
export function PageShell({
  title,
  description,
  icon,
  actions,
  children,
  titleOrder = 1,
  scroll = false,
}: PageShellProps) {
  return (
    <Box h="100%" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box
        pb="md"
        mb="lg"
        style={{ borderBottom: '1px solid var(--hh-border)', flexShrink: 0 }}
      >
        <Box
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <Stack gap={4}>
            <Title
              order={titleOrder}
              size={24}
              fw={700}
              lh={1.25}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: 'var(--hh-ink)',
              }}
            >
              {icon && (
                <span style={{ display: 'inline-flex', color: 'var(--hh-faint)' }}>{icon}</span>
              )}
              {title}
            </Title>
            {description && (
              <Text size="sm" c="var(--hh-muted)">
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
          overflowX: 'hidden',
          overflowY: scroll ? 'auto' : 'hidden',
          display: 'flex',
          flexDirection: 'column',
          // espaço para o anel de foco e para a rolagem não cortar a última borda
          ...(scroll ? { paddingBottom: 4, marginInline: -4, paddingInline: 4 } : {}),
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
