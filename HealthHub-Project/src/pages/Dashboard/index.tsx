import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Text, Box, Paper, Stack, ScrollArea, Flex, Group, TextInput, Title,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { CardDashboard } from '../../components/CardDashboard';
import { HistoryChart } from '../../components/GraphVital';
import { PatientSidebarCard } from '../../components/PatientSideBarCard';
import { PageShell } from '../../components/PageShell';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui';
import api from '../../services/api';
import type { Patient } from '../../types/patient';
import { useCare } from '../../context/CareContext';
import { manchesterCSSColor } from '../../utils/vitalStatus';
import { chatService } from '../../services/chatService';
import { useAgora, useMetricas } from '../../hooks/useMetricas';
import { formatDuracao, formatPct, type Metricas } from '../../services/metricas';
import { AtencaoAgora, Composicao, EsteiraFluxo, FaixaIndicadores, Tendencia30d } from './Blocos';

// Gráfico do paciente e lista lado a lado terminam na mesma linha
const ALTURA_FOCO = 'clamp(360px, 46vh, 480px)';

// A frase do topo: o que o plantão precisa saber primeiro, com nome e número.
function achado(m: Metricas): React.ReactNode {
  const criticos = m.atencao.filter((a) => a.nivel === 'critico');
  if (criticos.length) {
    const [c] = criticos;
    return (
      <>
        <Text span fw={600} c="var(--hh-negative)" inherit>
          {criticos.length === 1 ? '1 paciente com sinais críticos' : `${criticos.length} pacientes com sinais críticos`}
        </Text>
        {' — '}{c.nome}, {c.motivo}.
      </>
    );
  }
  if (m.esteira.maiorEspera && m.esteira.maiorEspera.minutos >= 30) {
    return (
      <>
        Maior espera: <Text span fw={600} c="var(--hh-ink)" inherit>{m.esteira.maiorEspera.nome}</Text>, há {formatDuracao(m.esteira.maiorEspera.minutos)}.
      </>
    );
  }
  if (m.esteira.total) return `${m.esteira.total} na esteira, nenhum alerta aberto.`;
  return 'Esteira vazia neste momento.';
}

export default function DashboardHome() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [graphRefreshKey, setGraphRefreshKey] = useState(0);
  const { carePatients } = useCare();
  const metricas = useMetricas();
  const agora = useAgora();
  const focoRef = useRef<HTMLDivElement>(null);

  const loadPatients = useCallback(async () => {
    try {
      // Pacientes que já receberam alta somem daqui — voltam ao readmitir na esteira
      const response = await api.get('/patients', { params: { ativo: true } });
      const data = response.data as Patient[];
      setPatients(data);
      setError(false);
      setSelectedPatient((atual) => {
        if (atual) return data.find((p) => p.id === atual.id) ?? atual;
        return data[0] ?? null;
      });
    } catch (err) {
      console.error('Erro ao carregar pacientes:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  // Alta/readmissão em outra sessão muda quem aparece aqui — mantém sincronizado
  useEffect(() => chatService.onFilaChanged(loadPatients), [loadPatients]);

  // Escuta evento global de sinais vitais salvos → refaz fetch + atualiza gráfico
  useEffect(() => {
    const handler = () => {
      loadPatients();
      setGraphRefreshKey((k) => k + 1);
    };
    window.addEventListener('vitals-updated', handler);
    return () => window.removeEventListener('vitals-updated', handler);
  }, [loadPatients]);

  // Clique num paciente da esteira ou da lista de atenção → vira o paciente em foco
  function focar(pacienteId: string) {
    const p = patients.find((x) => x.id === pacienteId);
    if (!p) return;
    setSelectedPatient(p);
    const reduz = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    focoRef.current?.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'start' });
  }

  const filteredSidebarPatients = patients.filter(
    (p) =>
      p.nome_completo.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      p.cpf?.includes(sidebarSearch),
  );

  const m = metricas.data;

  if (loading && !m) {
    return (
      <PageShell title="Painel" description="Carregando o pronto-atendimento…">
        <LoadingState rows={4} rowHeight={88} />
      </PageShell>
    );
  }

  const atualizado = m
    ? new Date(m.geradoEm).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <PageShell
      title="Painel"
      scroll
      description={m ? achado(m) : 'Métricas indisponíveis no momento.'}
      actions={
        atualizado && (
          <Group gap={8} wrap="nowrap" mt={6}>
            <span className="hh-live" aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--hh-positive)' }} />
            <Text size="sm" c="var(--hh-muted)">Ao vivo · atualizado às {atualizado}</Text>
          </Group>
        )
      }
    >
      <Stack gap="md">
        {metricas.error && !m && (
          <ErrorState message="Não foi possível carregar as métricas do pronto-atendimento." onRetry={metricas.recarregar} />
        )}

        {m && (
          <>
            <FaixaIndicadores
              itens={[
                {
                  rotulo: 'Na esteira',
                  valor: m.esteira.total,
                  detalhe: `${m.esteira.porEtapa['Aguardando Triagem']} aguardando triagem`,
                },
                {
                  rotulo: 'Maior espera',
                  valor: m.esteira.maiorEspera?.minutos ?? null,
                  formato: formatDuracao,
                  alerta: (m.esteira.maiorEspera?.minutos ?? 0) >= 30,
                  detalhe: m.esteira.maiorEspera?.nome ?? 'ninguém aguardando',
                  ajuda: 'Tempo desde a admissão de quem ainda aguarda triagem ou médico.',
                },
                {
                  rotulo: 'Chegadas hoje',
                  valor: m.hoje.chegadas,
                  detalhe: `média de ${(m.periodo30d.chegadas / 30).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por dia`,
                },
                {
                  rotulo: 'Altas hoje',
                  valor: m.hoje.altas,
                  detalhe: `${m.periodo30d.encerradas} em 30 dias`,
                },
                {
                  rotulo: 'Permanência média',
                  valor: m.periodo30d.permanenciaMediaMin,
                  formato: formatDuracao,
                  detalhe: m.periodo30d.permanenciaMedianaMin !== null
                    ? `mediana ${formatDuracao(m.periodo30d.permanenciaMedianaMin)} · 30 dias`
                    : 'sem altas em 30 dias',
                  ajuda: 'Da chegada à alta, nas visitas encerradas dos últimos 30 dias.',
                },
                {
                  rotulo: 'Readmissões',
                  valor: m.periodo30d.readmissoes,
                  detalhe: m.periodo30d.chegadas
                    ? `${formatPct(m.periodo30d.taxaReadmissao)} das ${m.periodo30d.chegadas} chegadas`
                    : 'sem chegadas em 30 dias',
                  ajuda: 'Pacientes que voltaram em até 30 dias após a alta anterior.',
                },
              ]}
            />

            <EsteiraFluxo
              fila={carePatients}
              agora={agora}
              esperaMediaMin={m.esteira.esperaMediaMin}
              onSelecionar={focar}
              selecionadoId={selectedPatient?.id}
            />

            <Box className="hh-grid-main">
              <Tendencia30d serie={m.serie30d} />
              <AtencaoAgora itens={m.atencao} onSelecionar={focar} />
            </Box>

            <Composicao periodo={m.periodo30d} />
          </>
        )}

        {/* ── Paciente em foco ── */}
        <Box ref={focoRef} pt="lg" style={{ scrollMarginTop: 8 }}>
          <Group justify="space-between" align="baseline" mb="sm" wrap="wrap">
            <Title order={2} size={18} fw={600} c="var(--hh-ink)">
              Paciente em foco
            </Title>
            <Text size="sm" c="var(--hh-muted)">
              {selectedPatient?.nome_completo ?? 'nenhum selecionado'}
            </Text>
          </Group>

          {error && (
            <ErrorState
              message="Não foi possível carregar os pacientes."
              onRetry={() => { setLoading(true); loadPatients(); }}
            />
          )}

          <Stack gap="md">
            <Box key={selectedPatient?.id ?? 'nenhum'} className="hh-fade">
              <CardDashboard patient={selectedPatient} />
            </Box>

            <Flex align="stretch" gap="md" direction={{ base: 'column', lg: 'row' }}>
              <Box style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: ALTURA_FOCO }}>
                <HistoryChart
                  patientId={selectedPatient?.id ?? ''}
                  patientName={selectedPatient?.nome_completo ?? ''}
                  refreshKey={graphRefreshKey}
                />
              </Box>

              <Box w={{ base: '100%', lg: 300 }} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', height: ALTURA_FOCO }}>
                <Paper p="md" withBorder style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
                  <Group justify="space-between" mb="xs">
                    <Text fw={600} size="md" c="var(--hh-ink)">Pacientes ativos</Text>
                    <Text size="sm" c="var(--hh-muted)">{filteredSidebarPatients.length}</Text>
                  </Group>

                  <TextInput
                    placeholder="Nome ou CPF"
                    aria-label="Buscar paciente por nome ou CPF"
                    leftSection={<IconSearch size={14} />}
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.currentTarget.value)}
                    mb="xs"
                  />

                  <ScrollArea style={{ flex: 1, minHeight: 0 }} type="hover" offsetScrollbars>
                    <Stack gap={2} pr="xs">
                      {filteredSidebarPatients.length > 0 ? (
                        filteredSidebarPatients.map((p) => (
                          <PatientSidebarCard
                            key={p.id}
                            patient={p}
                            isActive={selectedPatient?.id === p.id}
                            onClick={() => setSelectedPatient(p)}
                            dotColor={manchesterCSSColor(
                              carePatients.find((c) => c.paciente_id === p.id)?.gravidade,
                            )}
                          />
                        ))
                      ) : (
                        <EmptyState
                          message={sidebarSearch ? 'Nenhum paciente encontrado nessa busca.' : 'Nenhum paciente ativo no momento.'}
                        />
                      )}
                    </Stack>
                  </ScrollArea>
                </Paper>
              </Box>
            </Flex>
          </Stack>
        </Box>
      </Stack>
    </PageShell>
  );
}
