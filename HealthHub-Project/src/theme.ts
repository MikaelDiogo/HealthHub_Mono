import {
  createTheme,
  TextInput, PasswordInput, Select, Textarea, NumberInput,
  MultiSelect, Button, Badge, ActionIcon, Paper, Modal, Skeleton, Table, Tooltip,
} from '@mantine/core';

// Direção visual: clínico limpo (ver /DESIGN.md).
//  - primário quase preto (preenchimento escuro), acento azul só em dados, links e foco
//  - superfícies planas separadas por borda de 1px; sombra só no que flutua
//  - raios curtos e únicos; uma família tipográfica
export const healthHubTheme = createTheme({
  primaryColor: 'slate',
  primaryShade: { light: 8, dark: 6 },
  fontFamily: "'Manrope', system-ui, -apple-system, sans-serif",
  // Monoespaçada só para códigos e senhas de atendimento, nunca para rótulos
  fontFamilyMonospace: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", // taste-skill-ignore: só para senhas de atendimento (código literal)
  defaultRadius: 'md',
  radius: { xs: '4px', sm: '6px', md: '8px', lg: '12px', xl: '16px' },
  // Sombra apenas em elementos flutuantes (menu, popover, diálogo)
  shadows: {
    xs: 'none',
    sm: '0 1px 2px rgba(15, 23, 42, 0.06)',
    md: '0 4px 12px rgba(15, 23, 42, 0.08)',
    lg: '0 8px 24px rgba(15, 23, 42, 0.10)',
    xl: '0 12px 32px rgba(15, 23, 42, 0.12)',
  },
  headings: {
    fontFamily: "'Manrope', system-ui, sans-serif",
    fontWeight: '700',
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
    // Botões planos, sem raio exagerado
    Button:      Button.extend({ defaultProps: { radius: 'md' }, styles: { root: { fontWeight: 500 } } }),
    ActionIcon:  ActionIcon.extend({ defaultProps: { radius: 'md' } }),
    // Badge do Mantine em xs/sm usa 9–10px; piso de legibilidade é 12px
    Badge:       Badge.extend({ defaultProps: { radius: 'sm' }, styles: { root: { fontSize: '12px', height: '22px', textTransform: 'none', letterSpacing: 0 } } }),
    // Superfícies: borda fina na cor do sistema, sem sombra em repouso
    Paper: Paper.extend({
      defaultProps: { radius: 'md' },
      styles: { root: { borderColor: 'var(--hh-border)' } },
    }),
    Modal: Modal.extend({
      defaultProps: {
        radius: 'md', shadow: 'lg',
        overlayProps: { backgroundOpacity: 0.32, blur: 0 },
        // Abre com leve escala a partir do centro; fecha mais rápido do que abre
        transitionProps: { transition: 'pop', duration: 180, exitDuration: 120, timingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
      },
      styles: { title: { fontWeight: 600 } },
    }),
    // Carregando: blocos cinza chapados, sem brilho animado
    Skeleton: Skeleton.extend({ defaultProps: { animate: false } }),
    Table: Table.extend({ defaultProps: { verticalSpacing: 'sm', horizontalSpacing: 'md' } }),
    Tooltip: Tooltip.extend({
      defaultProps: { withArrow: true, openDelay: 120, transitionProps: { transition: 'fade', duration: 120 } },
      styles: { tooltip: { fontSize: '12px' } },
    }),
  },
});
