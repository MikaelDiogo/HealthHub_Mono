import type { ReactNode } from 'react';
import { Box, Text } from '@mantine/core';

// Seção vazia: mantém o quadro e diz, em uma frase com palavras do ofício,
// o que falta — nunca um ícone grande num mar de branco.
export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <Box
      px="md"
      py="sm"
      style={{
        border: '1px dashed var(--hh-control)',
        borderRadius: 'var(--hh-radius-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        minHeight: 40,
      }}
    >
      <Text size="sm" c="var(--hh-muted)">{message}</Text>
      {action}
    </Box>
  );
}
