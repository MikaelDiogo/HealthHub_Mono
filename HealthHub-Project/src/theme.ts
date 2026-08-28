import {
  createTheme,
  TextInput, PasswordInput, Select, Textarea, NumberInput,
  MultiSelect, Button, Badge, ActionIcon,
} from '@mantine/core';

export const healthHubTheme = createTheme({
  primaryColor: 'slate',
  fontFamily: "'Manrope', system-ui, -apple-system, sans-serif",
  fontFamilyMonospace: "'IBM Plex Mono', 'Courier New', monospace",
  defaultRadius: 'md',
  headings: {
    fontFamily: "'Manrope', system-ui, sans-serif",
    fontWeight: '800',
  },
  colors: {
    hub: [
      '#EEF3FF', '#DCE8FF', '#B8CFFF', '#8AB2FF',
      '#5990F5', '#3574E0', '#1B5FCC', '#144AAE', '#0E3788', '#082160',
    ],
    slate: [
      '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1',
      '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a',
    ],
  },
  components: {
    // Inputs menores por padrão — evita overrides locais
    TextInput:     TextInput.extend({ defaultProps: { size: 'sm', radius: 'md' } }),
    PasswordInput: PasswordInput.extend({ defaultProps: { size: 'sm', radius: 'md' } }),
    Select:        Select.extend({ defaultProps: { size: 'sm', radius: 'md' } }),
    Textarea:      Textarea.extend({ defaultProps: { size: 'sm', radius: 'md' } }),
    NumberInput:   NumberInput.extend({ defaultProps: { size: 'sm', radius: 'md' } }),
    MultiSelect:   MultiSelect.extend({ defaultProps: { size: 'sm', radius: 'md' } }),
    // Botões sem borda arredondada exagerada
    Button:      Button.extend({ defaultProps: { radius: 'md' } }),
    ActionIcon:  ActionIcon.extend({ defaultProps: { radius: 'md' } }),
    Badge:       Badge.extend({ defaultProps: { radius: 'sm' } }),
  },
});
