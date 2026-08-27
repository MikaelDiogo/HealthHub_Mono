import { createTheme } from '@mantine/core';

export const healthHubTheme = createTheme({
  primaryColor: 'slate',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  defaultRadius: 'md',
  headings: {
    fontWeight: '700',
  },
  colors: {
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
