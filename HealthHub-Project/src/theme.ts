import { createTheme } from '@mantine/core';

export const healthHubTheme = createTheme({
  primaryColor: 'hub',
  fontFamily: "'Manrope', system-ui, -apple-system, sans-serif",
  fontFamilyMonospace: "'IBM Plex Mono', 'Courier New', monospace",
  defaultRadius: 'md',
  headings: {
    fontFamily: "'Manrope', system-ui, sans-serif",
    fontWeight: '800',
  },
  colors: {
    // Paleta de marca HealthHub — azul institucional oklch(0.52 0.14 235)
    hub: [
      '#EEF3FF',
      '#DCE8FF',
      '#B8CFFF',
      '#8AB2FF',
      '#5990F5',
      '#3574E0',
      '#1B5FCC',
      '#144AAE',
      '#0E3788',
      '#082160',
    ],
    // Escala de slate (manter para elementos neutros)
    slate: [
      '#f8fafc',
      '#f1f5f9',
      '#e2e8f0',
      '#cbd5e1',
      '#94a3b8',
      '#64748b',
      '#475569',
      '#334155',
      '#1e293b',
      '#0f172a',
    ],
  },
});
