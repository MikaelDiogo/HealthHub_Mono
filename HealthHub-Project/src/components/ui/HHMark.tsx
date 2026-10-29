// Marca do HealthHub: cruz branca sobre quadrado da cor de acento. Plana, sem gradiente.
export function HHMark({ size = 32 }: { size?: number }) {
  const bar = Math.round(size * 0.5);
  const thick = Math.round(size * 0.16);
  return (
    <span
      aria-hidden
      style={{
        position: 'relative',
        display: 'inline-flex',
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: Math.round(size * 0.22),
        background: 'var(--hh-accent)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ position: 'absolute', width: bar, height: thick, borderRadius: 1, background: '#fff' }} />
      <span style={{ position: 'absolute', width: thick, height: bar, borderRadius: 1, background: '#fff' }} />
    </span>
  );
}
