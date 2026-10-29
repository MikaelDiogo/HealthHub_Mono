import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

// Mensagem de erro visível e dispensável. Some sozinha depois de alguns segundos
// (quando `autoOcultarMs` > 0) e é anunciada a leitores de tela (role="alert").
export function AvisoErro({ mensagem, onFechar, mb = 'md', flutuante = false }: { mensagem: string | null; onFechar: () => void; mb?: string; flutuante?: boolean }) {
  if (!mensagem) return null;
  const alerta = (
    <Alert
      role="alert"
      data-aviso-erro="true"
      color="red"
      variant="light"
      radius="md"
      mb={mb}
      icon={<IconAlertCircle size={16} />}
      withCloseButton
      closeButtonLabel="Fechar aviso"
      onClose={onFechar}
    >
      {mensagem}
    </Alert>
  );
  if (!flutuante) return alerta;
  // Fixo no rodapé da janela: continua visível mesmo que a página ou a lista role
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 400, width: 'min(560px, calc(100vw - 32px))', background: 'var(--hh-surface)', borderRadius: 'var(--hh-radius-card)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.14)' }}>
      {alerta}
    </div>
  );
}

export function useAviso(autoOcultarMs = 8000) {
  const [aviso, setAviso] = useState<string | null>(null);
  const t = useRef<number | undefined>(undefined);
  const mostrar = useCallback((m: string | null) => {
    window.clearTimeout(t.current);
    setAviso(m);
    if (m && autoOcultarMs > 0) t.current = window.setTimeout(() => setAviso(null), autoOcultarMs);
  }, [autoOcultarMs]);
  useEffect(() => () => window.clearTimeout(t.current), []);
  return [aviso, mostrar] as const;
}
