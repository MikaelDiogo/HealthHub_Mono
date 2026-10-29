import { Box, Button, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

// Erro dentro do bloco que falhou: uma frase + tentar de novo.
// A cor de erro vai só no ícone, nunca no bloco inteiro.
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Box
      role="alert"
      px="md"
      py="sm"
      style={{
        border: '1px solid var(--hh-border)',
        borderRadius: 'var(--hh-radius-card)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minHeight: 40,
      }}
    >
      <IconAlertCircle size={16} color="var(--hh-negative)" style={{ flexShrink: 0 }} />
      <Text size="sm" c="var(--hh-ink)" style={{ flex: 1 }}>{message}</Text>
      {onRetry && (
        <Button variant="subtle" color="slate" size="compact-sm" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </Box>
  );
}
