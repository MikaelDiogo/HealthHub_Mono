import { Box, Skeleton } from '@mantine/core';

// Carregando: o layout final com blocos cinza chapados no tamanho real
// (o tema desliga o brilho animado do Skeleton), sem deslocar nada quando os dados chegam.
export function LoadingState({ rows = 4, rowHeight = 44 }: { rows?: number; rowHeight?: number }) {
  return (
    <Box role="status" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} h={rowHeight} mb={8} radius="md" />
      ))}
    </Box>
  );
}
