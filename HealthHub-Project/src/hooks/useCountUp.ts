import { useEffect, useRef, useState } from 'react';

const reduzMovimento = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Anima um número do valor anterior até o novo (ease-out). Só feedback de
// mudança: quem pede menos movimento recebe o valor final direto.
export function useCountUp(valor: number, duracaoMs = 600): number {
  const [exibido, setExibido] = useState(valor);
  const anterior = useRef(valor);

  useEffect(() => {
    const de = anterior.current;
    anterior.current = valor;
    if (reduzMovimento() || de === valor) { setExibido(valor); return; }
    let raf = 0;
    const inicio = performance.now();
    const passo = (t: number) => {
      const p = Math.min(1, (t - inicio) / duracaoMs);
      const ease = 1 - Math.pow(1 - p, 3);
      setExibido(Math.round(de + (valor - de) * ease));
      if (p < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [valor, duracaoMs]);

  return exibido;
}
