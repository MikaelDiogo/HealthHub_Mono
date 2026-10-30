# DESIGN.md — HealthHub

Sistema de design do frontend do HealthHub (triagem hospitalar). Formato inspirado no
`DESIGN.md` do awesome-design-md; regras de tela de app baseadas na skill `design-taste-frontend`.
**Leia este arquivo antes de criar ou alterar qualquer tela.** Os valores vivem em
`src/index.css` (variáveis `--hh-*`) e `src/theme.ts` (tema do Mantine).

## 1. Atmosfera
Ferramenta de trabalho clínica, lida o dia inteiro por enfermeiros, médicos e recepção. Calma,
clara e densa em dados: fundo claro, superfícies planas separadas por linhas finas, texto escuro
de alto contraste. A cor é reservada para **dados** (categoria de risco, status de sinais vitais)
e para um único acento. Nada decorativo: sem gradiente, sem brilho, sem sombra em repouso.

## 2. Cores e papéis
| Papel | Token | Valor |
|---|---|---|
| Fundo da página | `--hh-ground` | `#f9fafb` |
| Superfície (cartão, painel) | `--hh-surface` | `#ffffff` |
| Superfície rebaixada | `--hh-raised` | `#f3f5f7` |
| Item ativo / hover do menu | `--hh-active` | `#eef1f4` |
| Borda de cartão | `--hh-border` | `#e5e7eb` |
| Linha de lista | `--hh-rule` | `#f1f5f9` |
| Borda de controle | `--hh-control` | `#d1d5db` |
| Texto principal | `--hh-ink` | `#0f172a` |
| Texto secundário | `--hh-muted` | `#475569` |
| Texto auxiliar | `--hh-faint` | `#64748b` |
| Acento (dados, links, foco) | `--hh-accent` | `#1b5fcc` |
| Positivo / Negativo (texto) | `--hh-positive` / `--hh-negative` | `#247b50` / `#c4242a` |

- **Primário = quase preto** (`slate`, shade 8). Um botão preenchido por tela.
- **Acento azul** só em dados, links, foco e no máximo um controle. Nunca em todo botão.
- **Texto**: todo nível ≥ 4,5:1 sobre branco e sobre `--hh-ground`, inclusive placeholders.
- **Cores de dado (não são decoração):** classificação de risco — vermelho, laranja, amarelo, verde, azul
  (`riscoCSSColor`); status de sinais vitais — crítico, alerta, normal (`getVitalStatus`).
  Ambos em `src/utils/vitalStatus.ts`. Não mudar o significado.
- Selos: par pálido (`--hh-pill-*-bg` com `--hh-pill-*-ink`). Verde/vermelho vivo não vai em texto.

## 3. Tipografia
- **Uma família: Manrope.** Monoespaçada só para códigos e senhas de atendimento.
- Escala: título da página 24 · seção/cartão 16 · corpo 14 · rótulo/auxiliar 12.
  **Nada abaixo de 12px.** Nenhum número acima de 40px; título de tela até 32px.
- Pesos: 400 corpo, 500 rótulos e botões, 600 títulos de cartão, 700 só título da página.
- Caixa de frase em rótulos e cabeçalhos de tabela. **Sem** caixa alta com espaçamento entre letras.
- Números sempre tabulares (`font-variant-numeric: tabular-nums`, já no `body`), alinhados à
  direita em colunas.

## 4. Componentes
- **Botão:** plano, altura 32–36px, raio 8. Primário escuro; secundário branco com borda
  `--hh-control`; terciário só texto.
- **Cartão/Painel:** `Paper` com `withBorder`, raio 8, padding 20, sem sombra.
- **Campo:** altura 32–36px, raio 8, borda `--hh-control`; foco com anel `--hh-accent`.
- **Selo (Badge):** 16–24px de altura, par pálido, só dentro de linhas ou ao lado de um valor.
- **Tabela:** sem zebra e sem faixa de cabeçalho; cabeçalho 12px cinza em caixa de frase; linhas
  de 1px `--hh-rule`; números à direita.
- **Menu lateral:** fundo da página, item ativo em pílula neutra `--hh-active` (rótulo igual),
  rótulos de grupo em caixa de frase 12px. Nome e marca do HealthHub no topo.
- **Ícone:** contorno, 16px, cinza, uma família (Tabler). Nunca dentro de quadrado ou círculo
  colorido; só neutro quando precisar de contêiner.
- **Estados de tela** (componentes em `src/components/ui`): vazio, carregando e erro.
  - *Vazio:* mantém o quadro e o cabeçalho; uma frase com palavras do ofício ("Nenhum paciente
    aguardando triagem.").
  - *Carregando:* blocos cinza chapados no tamanho real, sem brilho animado.
  - *Erro:* dentro do bloco que falhou; uma frase + "Tentar de novo".

## 5. Layout
- Base de 4px. Espaço entre cartões 16, padding de cartão 20, margem da página 24, entre seções 24–32.
- Uma grade, uma margem esquerda e uma direita; cartões na mesma linha terminam alinhados embaixo.
- Largura de dados: 1100–1250px; tabelas curtas pareiam com o próximo bloco, não esticam.
- Todo número de KPI é tipo, não tile: sem ícone em círculo, sem sparkline.

## 6. Profundidade
Superfícies planas: separação por 1px de borda ou um degrau de tom. **Borda ou sombra, nunca as
duas.** Sombra só em menu, popover, tooltip e diálogo (`shadows` do tema).

## 7. Faça e não faça
**Faça:** um acento; texto principal em `--hh-ink`; zero impresso como "0"; valor ausente como
"—" cinza; ação principal a um clique; `aria-label` em todo botão só de ícone.
**Não faça:** gradiente, vidro, brilho; badge em pílula acima de título; ícone em quadrado
colorido; fileira de cards idênticos com ícone; sparkline em KPI; zebra; número alinhado à
esquerda; caixa alta espaçada; emoji; violeta/índigo; título acima de 32px; fonte abaixo de 12px.

## 8. Responsivo
- Menu lateral recolhe abaixo de 768px (barra superior + painel). Alvos de toque ≥ 44px.
- Tabelas viram listas de duas linhas abaixo de ~640px; nunca rolagem horizontal da página.
- Verificar em 1440, 768 e 390px.

## 9. Guia rápido para o agente
> "Siga `DESIGN.md`. Fundo `--hh-ground`, cartões brancos com borda `--hh-border`, raio 8, sem
> sombra. Texto `--hh-ink`/`--hh-muted`. Um botão primário escuro; acento `--hh-accent` só em
> dados e links. Rótulos em caixa de frase ≥ 12px. Números tabulares. Use `EmptyState`,
> `LoadingState` e `ErrorState` para os três estados."
