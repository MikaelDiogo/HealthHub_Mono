import type { ReactNode } from 'react';
import { Box, Group, Paper, Text, Title, Tooltip, UnstyledButton } from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { IconChevronRight, IconInfoCircle } from '@tabler/icons-react';
import { useCountUp } from '../../hooks/useCountUp';
import {
  formatDuracao, formatPct, type Etapa, type Metricas,
} from '../../services/metricas';
import type { FilaPaciente } from '../../context/CareContext';
import { manchesterCSSColor, NIVEIS_MANCHESTER } from '../../utils/vitalStatus';
import { EmptyState } from '../../components/ui';

const ESPERA_ALERTA_MIN = 30;

// ─── Moldura de bloco: título + uma linha de contexto à direita ──────────────
export function Bloco({ titulo, meta, children, pad = 20, id }: {
  titulo: string; meta?: ReactNode; children: ReactNode; pad?: number; id?: string;
}) {
  return (
    <Paper withBorder p={pad} id={id} style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <Group justify="space-between" align="baseline" mb="md" gap="xs" wrap="wrap">
        <Title order={2} size={15} fw={600} c="var(--hh-ink)" lh={1.3}>{titulo}</Title>
        {meta && <Text size="sm" c="var(--hh-faint)">{meta}</Text>}
      </Group>
      {children}
    </Paper>
  );
}

// ─── Faixa de indicadores ─────────────────────────────────────────────────────
interface Indicador {
  rotulo: string;
  valor: number | null;
  formato?: (n: number) => string;
  detalhe?: ReactNode;
  ajuda?: string;
  alerta?: boolean;
}

function ValorAnimado({ valor, formato, alerta }: Pick<Indicador, 'valor' | 'formato' | 'alerta'>) {
  const n = useCountUp(valor ?? 0);
  if (valor === null) {
    return <Text component="span" fz={30} fw={600} lh={1.1} c="var(--hh-faint)" aria-label="sem dado">—</Text>;
  }
  return (
    <Text component="span" fz={30} fw={600} lh={1.1} c={alerta ? 'var(--hh-negative)' : 'var(--hh-ink)'} style={{ letterSpacing: '-0.02em' }}>
      {formato ? formato(n) : n.toLocaleString('pt-BR')}
    </Text>
  );
}

export function FaixaIndicadores({ itens }: { itens: Indicador[] }) {
  return (
    <Paper withBorder style={{ overflow: 'hidden', flexShrink: 0 }}>
      <Box
        className="hh-stagger"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))',
          gap: 1,
          background: 'var(--hh-border)',
        }}
      >
        {itens.map((k) => (
          <Box key={k.rotulo} px={20} py={18} style={{ background: 'var(--hh-surface)', minWidth: 0 }}>
            <Group gap={4} mb={8} wrap="nowrap">
              <Text size="sm" c="var(--hh-muted)" truncate>{k.rotulo}</Text>
              {k.ajuda && (
                <Tooltip label={k.ajuda} multiline w={240}>
                  <IconInfoCircle size={14} color="var(--hh-faint)" aria-label={k.ajuda} style={{ flexShrink: 0 }} />
                </Tooltip>
              )}
            </Group>
            <ValorAnimado valor={k.valor} formato={k.formato} alerta={k.alerta} />
            <Text size="xs" c="var(--hh-faint)" mt={6} truncate>{k.detalhe ?? ' '}</Text>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

// ─── Esteira agora: as 5 etapas lado a lado, com quem está em cada uma ───────
// Leitura em uma passada: número da etapa → nome → quantos → quem (com a cor do
// risco e há quanto tempo). Clicar num nome leva ao "Paciente em foco".
const ETAPAS: { etapa: Etapa; rotulo: string; quem: string }[] = [
  { etapa: 'Aguardando Triagem', rotulo: 'Aguardando triagem', quem: 'Recepção' },
  { etapa: 'Em Triagem (Enfermeiro)', rotulo: 'Em triagem', quem: 'Enfermagem' },
  { etapa: 'Aguardando Atendimento', rotulo: 'Aguardando médico', quem: 'Já triados' },
  { etapa: 'Em Consulta (Médico)', rotulo: 'Em consulta', quem: 'Médico' },
  { etapa: 'Em Observação', rotulo: 'Em observação', quem: 'Ala de observação' },
];
const VISIVEIS_POR_ETAPA = 4;

function esperaDe(p: FilaPaciente, agora: Date): number | null {
  if (!p.created_at) return null;
  return Math.max(0, Math.round((agora.getTime() - new Date(p.created_at).getTime()) / 60_000));
}

/** "Maria Souza Lima" → "Maria Lima" */
function nomeCurto(nome: string): string {
  const partes = (nome || 'Sem nome').trim().split(/\s+/);
  return partes.length > 2 ? `${partes[0]} ${partes[partes.length - 1]}` : partes.join(' ');
}

export function EsteiraFluxo({ fila, agora, esperaMediaMin, onSelecionar, selecionadoId }: {
  fila: FilaPaciente[];
  agora: Date;
  esperaMediaMin: number | null;
  onSelecionar: (pacienteId: string) => void;
  selecionadoId?: string;
}) {
  return (
    <Bloco
      titulo="Esteira agora"
      meta={fila.length ? `${fila.length} ${fila.length === 1 ? 'paciente' : 'pacientes'} · espera média ${formatDuracao(esperaMediaMin)}` : undefined}
    >
      {fila.length === 0 ? (
        <EmptyState message="Ninguém na esteira. Admita um paciente pela Esteira de Cuidado." />
      ) : (
        <>
          <Box
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 8,
            }}
          >
            {ETAPAS.map(({ etapa, rotulo, quem }, i) => {
              const nela = fila
                .filter((f) => f.status === etapa)
                .sort((a, b) => (esperaDe(b, agora) ?? 0) - (esperaDe(a, agora) ?? 0));
              const ativa = nela.length > 0;
              const aguarda = etapa === 'Aguardando Triagem' || etapa === 'Aguardando Atendimento';
              const ultima = i === ETAPAS.length - 1;
              return (
                <Box
                  key={etapa}
                  style={{
                    position: 'relative',
                    minWidth: 0,
                    borderRadius: 'var(--hh-radius-card)',
                    background: ativa ? 'var(--hh-surface)' : 'var(--hh-ground)',
                    border: `1px solid ${ativa ? 'var(--hh-border)' : 'var(--hh-rule)'}`,
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* seta para a próxima etapa: a esteira anda da esquerda para a direita */}
                  {!ultima && (
                    <IconChevronRight
                      size={14}
                      aria-hidden
                      className="hh-seta-etapa"
                      color="var(--hh-faint)"
                      style={{ position: 'absolute', right: -11, top: 18, background: 'var(--hh-surface)', borderRadius: '50%', zIndex: 1 }}
                    />
                  )}

                  <Group gap={8} wrap="nowrap" align="flex-start">
                    <Box
                      aria-hidden
                      style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        display: 'grid', placeItems: 'center',
                        fontSize: 12, fontWeight: 600,
                        background: ativa ? 'var(--hh-ink)' : 'var(--hh-raised)',
                        color: ativa ? 'var(--hh-surface)' : 'var(--hh-faint)',
                      }}
                    >
                      {i + 1}
                    </Box>
                    <Box style={{ minWidth: 0, flex: 1 }}>
                      <Text size="sm" fw={600} c={ativa ? 'var(--hh-ink)' : 'var(--hh-muted)'} lh={1.3}>{rotulo}</Text>
                      <Text size="xs" c="var(--hh-faint)" truncate>{quem}</Text>
                    </Box>
                    <Text fz={20} fw={600} lh={1} c={ativa ? 'var(--hh-ink)' : 'var(--hh-faint)'}>{nela.length}</Text>
                  </Group>

                  <Box className="hh-stagger" mt={10} style={{ display: 'flex', flexDirection: 'column', gap: 2, margin: '10px -6px 0' }}>
                    {!ativa && (
                      <Text size="xs" c="var(--hh-faint)" px={6} py={4}>Ninguém nesta etapa</Text>
                    )}
                    {nela.slice(0, VISIVEIS_POR_ETAPA).map((p) => {
                      const espera = esperaDe(p, agora);
                      const longa = aguarda && espera !== null && espera >= ESPERA_ALERTA_MIN;
                      const risco = p.gravidade ? `risco ${p.gravidade.toLowerCase()}` : 'ainda sem classificação de risco';
                      return (
                        <UnstyledButton
                          key={p.id}
                          className="hh-row"
                          aria-pressed={p.paciente_id === selecionadoId}
                          aria-label={`${p.nome}, ${risco}${espera !== null ? `, ${aguarda ? 'aguardando há' : 'na etapa há'} ${formatDuracao(espera)}` : ''}. Ver em foco.`}
                          onClick={() => onSelecionar(p.paciente_id)}
                          px={6}
                          py={5}
                          style={{ borderRadius: 'var(--hh-radius-chip)' }}
                        >
                          <Group gap={8} wrap="nowrap">
                            <span
                              aria-hidden
                              title={risco}
                              style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: manchesterCSSColor(p.gravidade) }}
                            />
                            <Text size="xs" fw={500} c="var(--hh-ink)" truncate style={{ flex: 1 }}>{nomeCurto(p.nome)}</Text>
                            {espera !== null && (
                              <Text
                                size="xs"
                                fw={longa ? 600 : 400}
                                c={longa ? 'var(--hh-warning)' : 'var(--hh-faint)'}
                                style={{ whiteSpace: 'nowrap' }}
                              >
                                {formatDuracao(espera)}
                              </Text>
                            )}
                          </Group>
                        </UnstyledButton>
                      );
                    })}
                    {nela.length > VISIVEIS_POR_ETAPA && (
                      <Text size="xs" c="var(--hh-muted)" px={6} py={4}>
                        e mais {nela.length - VISIVEIS_POR_ETAPA}
                      </Text>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* legenda em frase: o que a bolinha e o tempo querem dizer */}
          <Group gap="md" mt="md" pt="sm" wrap="wrap" style={{ borderTop: '1px solid var(--hh-rule)' }}>
            <Text size="xs" c="var(--hh-muted)">Cor = risco Manchester:</Text>
            {NIVEIS_MANCHESTER.map((n) => (
              <Group key={n.nivel} gap={5} wrap="nowrap">
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: manchesterCSSColor(n.nivel) }} />
                <Text size="xs" c="var(--hh-muted)">{n.nivel}</Text>
              </Group>
            ))}
            <Group gap={5} wrap="nowrap">
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: manchesterCSSColor(null) }} />
              <Text size="xs" c="var(--hh-muted)">Sem classificação</Text>
            </Group>
            <Text size="xs" c="var(--hh-faint)" ml="auto">
              Tempo desde a chegada · em laranja acima de {ESPERA_ALERTA_MIN} min
            </Text>
          </Group>
        </>
      )}
    </Bloco>
  );
}

// ─── Atenção agora ────────────────────────────────────────────────────────────
export function AtencaoAgora({ itens, onSelecionar }: {
  itens: Metricas['atencao'];
  onSelecionar: (pacienteId: string) => void;
}) {
  const criticos = itens.filter((i) => i.nivel === 'critico').length;
  return (
    <Bloco
      titulo="Atenção agora"
      meta={itens.length ? (criticos ? `${criticos} com sinais críticos` : `${itens.length} em espera longa`) : undefined}
    >
      {itens.length === 0 ? (
        <EmptyState message={`Ninguém com sinais críticos ou esperando mais de ${ESPERA_ALERTA_MIN} min.`} />
      ) : (
        <Box className="hh-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 2, margin: '-6px -10px' }}>
          {itens.map((a) => (
            <UnstyledButton
              key={`${a.paciente_id}-${a.nivel}`}
              className="hh-row"
              onClick={() => onSelecionar(a.paciente_id)}
              px={10}
              py={8}
              style={{ borderRadius: 'var(--hh-radius-control)' }}
            >
              <Group wrap="nowrap" gap="sm" align="flex-start">
                <span
                  aria-hidden
                  style={{
                    width: 8, height: 8, borderRadius: '50%', marginTop: 7, flexShrink: 0,
                    background: a.nivel === 'critico' ? 'var(--hh-negative)' : 'var(--hh-warning)',
                  }}
                />
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" fw={600} c="var(--hh-ink)" truncate>{a.nome}</Text>
                  <Text size="xs" c="var(--hh-muted)" truncate>
                    {a.nivel === 'critico'
                      ? a.motivo
                      : a.motivo === 'Aguardando Atendimento' ? 'Aguardando médico' : 'Aguardando triagem'}
                  </Text>
                </Box>
                <Text
                  size="sm"
                  fw={600}
                  c={a.nivel === 'critico' ? 'var(--hh-negative)' : 'var(--hh-warning)'}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {a.nivel === 'critico' ? 'Crítico' : formatDuracao(a.esperaMin)}
                </Text>
              </Group>
            </UnstyledButton>
          ))}
        </Box>
      )}
    </Bloco>
  );
}

// ─── Tendência de 30 dias ─────────────────────────────────────────────────────
export function Tendencia30d({ serie }: { serie: Metricas['serie30d'] }) {
  const chegadas = serie.reduce((s, d) => s + d.chegadas, 0);
  const altas = serie.reduce((s, d) => s + d.altas, 0);
  const pico = serie.reduce((m, d) => (d.chegadas > m.chegadas ? d : m), serie[0]);
  return (
    <Bloco
      titulo="Movimento em 30 dias"
      meta={
        <Group gap="md" component="span">
          <Group gap={6} component="span" wrap="nowrap">
            <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--hh-accent)' }} />
            <Text span size="sm" c="var(--hh-muted)">Chegadas <Text span fw={600} c="var(--hh-ink)" inherit>{chegadas}</Text></Text>
          </Group>
          <Group gap={6} component="span" wrap="nowrap">
            <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--mantine-color-slate-3)' }} />
            <Text span size="sm" c="var(--hh-muted)">Altas <Text span fw={600} c="var(--hh-ink)" inherit>{altas}</Text></Text>
          </Group>
        </Group>
      }
    >
      {chegadas + altas === 0 ? (
        <EmptyState message="Nenhuma chegada ou alta nos últimos 30 dias." />
      ) : (
        <>
          <BarChart
            h={210}
            data={serie}
            dataKey="rotulo"
            series={[
              { name: 'chegadas', label: 'Chegadas', color: 'hub.6' },
              { name: 'altas', label: 'Altas', color: 'slate.3' },
            ]}
            tickLine="none"
            gridAxis="x"
            strokeDasharray="0"
            gridColor="var(--hh-rule)"
            barProps={{ radius: [3, 3, 0, 0] }}
            maxBarWidth={10}
            xAxisProps={{ interval: 4, tickMargin: 8 }}
            yAxisProps={{ allowDecimals: false, width: 28 }}
            tooltipAnimationDuration={120}
          />
          {pico && pico.chegadas > 0 && (
            <Text size="xs" c="var(--hh-faint)" mt="xs">
              Pico em {pico.rotulo}, com {pico.chegadas} {pico.chegadas === 1 ? 'chegada' : 'chegadas'}.
            </Text>
          )}
        </>
      )}
    </Bloco>
  );
}

// ─── Composição: desfechos e risco na chegada ────────────────────────────────
const NOME_DESFECHO: Record<string, string> = {
  Alta: 'Alta',
  Internacao: 'Internação',
  Transferencia: 'Transferência',
  'Saida Voluntaria': 'Saída voluntária',
  'Em Atendimento': 'Em atendimento',
};

export function Composicao({ periodo }: { periodo: Metricas['periodo30d'] }) {
  const desfechos = Object.entries(periodo.desfechos).sort((a, b) => b[1] - a[1]);
  const totalDesf = desfechos.reduce((s, [, n]) => s + n, 0);
  const riscos = NIVEIS_MANCHESTER.map((n) => ({ ...n, qtd: periodo.risco[n.nivel] ?? 0 }));
  const totalRisco = riscos.reduce((s, r) => s + r.qtd, 0);

  return (
    <Bloco titulo="Últimos 30 dias, por visita" meta={`${periodo.chegadas} chegadas · ${periodo.encerradas} encerradas`}>
      <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 40 }}>
        <Box>
          <Text size="sm" fw={600} c="var(--hh-ink)" mb="sm">Como terminaram</Text>
          {totalDesf === 0 ? (
            <EmptyState message="Nenhuma visita encerrada nos últimos 30 dias." />
          ) : (
            <Box style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {desfechos.map(([d, n]) => (
                <Box key={d}>
                  <Group justify="space-between" mb={6} wrap="nowrap">
                    <Text size="sm" c="var(--hh-ink)">{NOME_DESFECHO[d] ?? d}</Text>
                    <Text size="sm" c="var(--hh-muted)">
                      <Text span fw={600} c="var(--hh-ink)" inherit>{n}</Text> · {formatPct(n / totalDesf)}
                    </Text>
                  </Group>
                  <Box style={{ height: 6, borderRadius: 3, background: 'var(--hh-raised)', overflow: 'hidden' }}>
                    <Box className="hh-bar" style={{ width: `${(n / totalDesf) * 100}%`, height: '100%', borderRadius: 3, background: 'var(--hh-ink)' }} />
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Box>
          <Text size="sm" fw={600} c="var(--hh-ink)" mb="sm">Risco na chegada</Text>
          {totalRisco === 0 ? (
            <Text size="sm" c="var(--hh-faint)">Nenhuma chegada classificada no período.</Text>
          ) : (
            <>
              <Box
                role="img"
                aria-label={riscos.filter((r) => r.qtd).map((r) => `${r.nivel}: ${r.qtd}`).join(', ')}
                className="hh-bar"
                style={{ display: 'flex', height: 10, borderRadius: 3, overflow: 'hidden', gap: 2 }}
              >
                {riscos.filter((r) => r.qtd).map((r) => (
                  <Box key={r.nivel} style={{ flex: r.qtd, background: manchesterCSSColor(r.nivel) }} />
                ))}
              </Box>
              <Group gap="md" mt="sm">
                {riscos.filter((r) => r.qtd).map((r) => (
                  <Group key={r.nivel} gap={6} wrap="nowrap">
                    <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: manchesterCSSColor(r.nivel) }} />
                    <Text size="xs" c="var(--hh-muted)">{r.nivel} <Text span fw={600} c="var(--hh-ink)" inherit>{r.qtd}</Text></Text>
                  </Group>
                ))}
              </Group>
            </>
          )}
        </Box>
      </Box>
    </Bloco>
  );
}
