import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon, Box, Button, Group, Modal, ScrollArea, Skeleton, Stack, Text, TextInput, Textarea, UnstyledButton,
} from '@mantine/core';
import { IconCheck, IconSearch, IconX } from '@tabler/icons-react';
import api from '../../services/api';
import type { Patient } from '../../types/patient';
import { proximaSenha, useCare } from '../../context/CareContext';
import { horarioBrasilia } from '../../utils/datetime';
import { riscoCSSColor } from '../../utils/vitalStatus';
import {
  buscarHistoricoPacientes, formatDataCurta, formatDuracao, ordinal, tempoAtras, type ResumoHistorico,
} from '../../services/metricas';
import { useAgora } from '../../hooks/useMetricas';
import { EmptyState, LoadingState } from '../ui';

interface Visita {
  id: string;
  chegada: string;
  alta: string | null;
  desfecho: string;
  classificacao_risco: string | null;
  motivo_visita: string | null;
}

const NOME_DESFECHO: Record<string, string> = {
  Alta: 'Alta', Internacao: 'Internação', Transferencia: 'Transferência',
  'Saida Voluntaria': 'Saída voluntária', 'Em Atendimento': 'Em atendimento',
};

const DIA_MS = 86_400_000;

function linhaHistorico(h?: ResumoHistorico): string {
  if (!h) return 'Primeira visita';
  const n = h.total === 1 ? '1 visita' : `${h.total} visitas`;
  return `Retorno · ${n} · última ${tempoAtras(h.ultima.chegada)}`;
}

/** "Nenhuma conhecida", "Nega alergias", "Não" etc. não são alergia — não recebem o destaque vermelho. */
function temAlergia(texto?: string | null): boolean {
  const t = (texto ?? '').trim().toLowerCase();
  return !!t && !/^(nenhum|nenhuma|nega|não|nao|sem\b|nada|-)/.test(t);
}

/** Voltou até 30 dias depois da última alta: sinal clínico, não só administrativo. */
function readmissao30d(h: ResumoHistorico | undefined, agora: Date): boolean {
  return !!h?.ultima.alta && agora.getTime() - new Date(h.ultima.alta).getTime() <= 30 * DIA_MS;
}

// ─── Detalhe do paciente escolhido ────────────────────────────────────────────
function Detalhe({ paciente, resumo, agora, onAdmitir, admitindo, senha }: {
  paciente: Patient;
  resumo?: ResumoHistorico;
  agora: Date;
  onAdmitir: (motivo: string) => Promise<void>;
  admitindo: boolean;
  senha: string;
}) {
  const [visitas, setVisitas] = useState<Visita[] | null>(null);
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    setMotivo('');
    if (!resumo) { setVisitas([]); return; }
    setVisitas(null);
    let vivo = true;
    api.get(`/patients/${paciente.id}/visitas`)
      .then((r) => { if (vivo) setVisitas((r.data?.visitas ?? []) as Visita[]); })
      .catch(() => { if (vivo) setVisitas([]); });
    return () => { vivo = false; };
  }, [paciente.id, resumo]);

  const proxima = (resumo?.total ?? 0) + 1;
  const volta30 = readmissao30d(resumo, agora);
  const identificacao = [
    paciente.idade ? `${paciente.idade} anos` : null,
    paciente.sexo || null,
    paciente.cpf ? `CPF ${paciente.cpf}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <Box key={paciente.id} className="hh-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <ScrollArea style={{ flex: 1 }} type="auto" offsetScrollbars>
        <Box p="lg" pb="md">
          <Text fz={20} fw={600} c="var(--hh-ink)" lh={1.25}>{paciente.nome_completo || 'Sem nome'}</Text>
          <Text size="sm" c="var(--hh-muted)" mt={2}>{identificacao || 'Sem dados de identificação'}</Text>

          {volta30 && (
            <Group gap={8} mt="md" px="sm" py={8} wrap="nowrap" style={{ background: 'var(--hh-pill-warning-bg)', borderRadius: 'var(--hh-radius-control)' }}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--hh-warning)', flexShrink: 0 }} />
              <Text size="sm" c="var(--hh-pill-warning-ink)">
                Readmissão em 30 dias — alta {tempoAtras(resumo!.ultima.alta!, agora)}
                {resumo!.ultima.motivo_visita ? `, após “${resumo!.ultima.motivo_visita}”` : ''}.
              </Text>
            </Group>
          )}

          {/* Alergias primeiro: é o que muda conduta já na triagem */}
          <Box mt="lg" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <Box>
              <Text size="xs" c="var(--hh-muted)" mb={4}>Alergias</Text>
              {temAlergia(paciente.alergias) ? (
                <Text size="sm" fw={600} c="var(--hh-negative)">{paciente.alergias}</Text>
              ) : (
                <Text size="sm" c="var(--hh-muted)">{paciente.alergias?.trim() || 'Nenhuma registrada'}</Text>
              )}
            </Box>
            <Box>
              <Text size="xs" c="var(--hh-muted)" mb={4}>Medicamentos em uso</Text>
              <Text size="sm" c={paciente.medicamentos_em_uso ? 'var(--hh-ink)' : 'var(--hh-faint)'}>
                {paciente.medicamentos_em_uso || 'Nenhum registrado'}
              </Text>
            </Box>
          </Box>

          <Group justify="space-between" align="baseline" mt="xl" mb="sm">
            <Text size="sm" fw={600} c="var(--hh-ink)">Visitas anteriores</Text>
            {resumo && <Text size="sm" c="var(--hh-faint)">{resumo.total}</Text>}
          </Group>

          {visitas === null ? (
            <Stack gap={8}>{[0, 1].map((i) => <Skeleton key={i} h={52} />)}</Stack>
          ) : visitas.length === 0 ? (
            <Text size="sm" c="var(--hh-faint)">Nenhuma visita anterior — esta será a primeira.</Text>
          ) : (
            <Box className="hh-stagger" style={{ borderTop: '1px solid var(--hh-rule)' }}>
              {visitas.slice(0, 5).map((v, i) => {
                const dur = v.alta ? Math.round((new Date(v.alta).getTime() - new Date(v.chegada).getTime()) / 60_000) : null;
                return (
                  <Group key={v.id} py={10} gap="sm" wrap="nowrap" align="flex-start" style={{ borderBottom: '1px solid var(--hh-rule)' }}>
                    <Text size="xs" c="var(--hh-faint)" w={28} pt={2} style={{ flexShrink: 0 }}>
                      {ordinal(visitas.length - i)}
                    </Text>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Group gap={8} wrap="nowrap">
                        <Text size="sm" fw={500} c="var(--hh-ink)">{formatDataCurta(v.chegada)}</Text>
                        <Text size="xs" c="var(--hh-faint)">{tempoAtras(v.chegada, agora)}</Text>
                      </Group>
                      <Text size="xs" c="var(--hh-muted)" truncate>
                        {v.motivo_visita || 'Motivo não registrado'}
                      </Text>
                    </Box>
                    <Box style={{ textAlign: 'right', flexShrink: 0 }}>
                      <Group gap={6} justify="flex-end" wrap="nowrap">
                        {v.classificacao_risco && (
                          <span
                            aria-label={`Risco ${v.classificacao_risco}`}
                            title={`Risco ${v.classificacao_risco}`}
                            style={{ width: 8, height: 8, borderRadius: 2, background: riscoCSSColor(v.classificacao_risco) }}
                          />
                        )}
                        <Text size="sm" c="var(--hh-ink)">{NOME_DESFECHO[v.desfecho] ?? v.desfecho}</Text>
                      </Group>
                      <Text size="xs" c="var(--hh-faint)">{dur !== null ? formatDuracao(dur) : 'em aberto'}</Text>
                    </Box>
                  </Group>
                );
              })}
            </Box>
          )}

          <Textarea
            mt="xl"
            label="Motivo da visita"
            description="Queixa principal, nas palavras do paciente. Fica no histórico."
            placeholder="Ex.: dor no peito há 2 horas"
            autosize
            minRows={2}
            maxRows={4}
            value={motivo}
            onChange={(e) => setMotivo(e.currentTarget.value)}
          />
        </Box>
      </ScrollArea>

      <Group justify="space-between" px="lg" py="md" wrap="wrap" gap="sm" style={{ borderTop: '1px solid var(--hh-border)' }}>
        <Text size="sm" c="var(--hh-muted)">
          Senha <Text span ff="monospace" fw={600} c="var(--hh-ink)" inherit>{senha}</Text>
        </Text>
        <Button loading={admitindo} onClick={() => onAdmitir(motivo)}>
          {proxima === 1 ? 'Admitir — 1ª visita' : `Admitir como ${ordinal(proxima)} visita`}
        </Button>
      </Group>
    </Box>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
// Lista à esquerda, histórico à direita: quem admite vê de onde o paciente vem
// (visitas, desfechos, alergias) antes de colocá-lo na esteira.
export function AdmitirModal({ opened, onClose, pacienteInicialId }: {
  opened: boolean;
  onClose: () => void;
  pacienteInicialId?: string | null;
}) {
  const { carePatients, admitirPaciente } = useCare();
  const [pacientes, setPacientes] = useState<Patient[]>([]);
  const [historico, setHistorico] = useState<Record<string, ResumoHistorico>>({});
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [admitindo, setAdmitindo] = useState(false);
  const [admitidos, setAdmitidos] = useState<{ id: string; nome: string; horario: string; senha: string }[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const agora = useAgora(15_000);

  useEffect(() => {
    if (!opened) return;
    setLoading(true);
    setAdmitidos([]);
    setErro(null);
    setQuery('');
    setSelecionadoId(pacienteInicialId ?? null);
    Promise.all([
      api.get('/patients').then((r) => setPacientes(r.data as Patient[])),
      buscarHistoricoPacientes().then(setHistorico).catch(() => setHistorico({})),
    ]).catch(() => setErro('Não foi possível carregar os pacientes.'))
      .finally(() => setLoading(false));
  }, [opened, pacienteInicialId]);

  const naEsteira = useMemo(() => new Set(carePatients.map((c) => c.paciente_id)), [carePatients]);

  const lista = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digitos = q.replace(/\D/g, '');
    return pacientes
      .filter((p) => !naEsteira.has(p.id))
      .filter((p) => !q || (p.nome_completo || '').toLowerCase().includes(q) || (digitos.length > 0 && (p.cpf || '').includes(digitos)))
      // retornos mais recentes primeiro, depois quem nunca veio, em ordem alfabética
      .sort((a, b) => {
        const ha = historico[a.id]?.ultima.chegada ?? '';
        const hb = historico[b.id]?.ultima.chegada ?? '';
        if (ha !== hb) return hb.localeCompare(ha);
        return (a.nome_completo || '').localeCompare(b.nome_completo || '');
      });
  }, [pacientes, naEsteira, query, historico]);

  const selecionado = pacientes.find((p) => p.id === selecionadoId && !naEsteira.has(p.id)) ?? null;
  const senha = proximaSenha(carePatients);

  async function admitir(motivo: string) {
    if (!selecionado) return;
    setAdmitindo(true);
    setErro(null);
    try {
      await admitirPaciente(selecionado, senha, motivo);
      setAdmitidos((prev) => [...prev, { id: selecionado.id, nome: selecionado.nome_completo, horario: horarioBrasilia(), senha }]);
      setSelecionadoId(null);
      buscarHistoricoPacientes().then(setHistorico).catch(() => {});
    } catch {
      setErro('Não foi possível admitir. Tente de novo.');
    } finally {
      setAdmitindo(false);
    }
  }

  const relogio = agora.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false}
      size={960}
      padding={0}
      centered
      aria-labelledby="admitir-titulo"
    >
      <Group justify="space-between" wrap="nowrap" px="lg" py="md" style={{ borderBottom: '1px solid var(--hh-border)' }}>
        <Box>
          <Text id="admitir-titulo" fw={600} size="lg" c="var(--hh-ink)">Admitir na esteira</Text>
          <Text size="sm" c="var(--hh-muted)">
            Chegada registrada às <Text span fw={600} c="var(--hh-ink)" inherit>{relogio}</Text>, horário de Brasília
          </Text>
        </Box>
        <ActionIcon variant="subtle" color="slate" size="lg" onClick={onClose} aria-label="Fechar">
          <IconX size={18} />
        </ActionIcon>
      </Group>

      <Box className="hh-split">
        {/* ── Lista ── */}
        <Box style={{ display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: '1px solid var(--hh-border)' }} className="hh-split-list">
          <Box p="md" pb="xs">
            <TextInput
              placeholder="Nome ou CPF"
              aria-label="Buscar paciente por nome ou CPF"
              leftSection={<IconSearch size={14} />}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              data-autofocus
            />
          </Box>

          {admitidos.length > 0 && (
            <Box mx="md" mb="xs" className="hh-stagger">
              {admitidos.map((a) => (
                <Group key={a.id} gap={8} py={4} wrap="nowrap">
                  <IconCheck size={14} color="var(--hh-positive)" style={{ flexShrink: 0 }} />
                  <Text size="xs" c="var(--hh-ink)" truncate style={{ flex: 1 }}>{a.nome}</Text>
                  <Text size="xs" c="var(--hh-faint)" ff="monospace">{a.senha}</Text>
                </Group>
              ))}
            </Box>
          )}

          <ScrollArea style={{ flex: 1 }} type="auto">
            <Box px="xs" pb="md">
              {loading ? (
                <Box px="xs"><LoadingState rows={5} rowHeight={48} /></Box>
              ) : lista.length === 0 ? (
                <Box px="xs">
                  <EmptyState message={pacientes.length === 0 ? 'Nenhum paciente cadastrado.' : query ? 'Ninguém encontrado com essa busca.' : 'Todos os pacientes já estão na esteira.'} />
                </Box>
              ) : (
                <Stack gap={2} role="listbox" aria-label="Pacientes disponíveis">
                  {lista.map((p) => {
                    const h = historico[p.id];
                    const ativo = p.id === selecionadoId;
                    return (
                      <UnstyledButton
                        key={p.id}
                        role="option"
                        aria-selected={ativo}
                        className="hh-row"
                        onClick={() => setSelecionadoId(p.id)}
                        px="sm"
                        py={8}
                        style={{ borderRadius: 'var(--hh-radius-control)' }}
                      >
                        <Group gap="sm" wrap="nowrap">
                          <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text size="sm" fw={ativo ? 600 : 500} c="var(--hh-ink)" truncate>{p.nome_completo || 'Sem nome'}</Text>
                            <Text size="xs" c={readmissao30d(h, agora) ? 'var(--hh-warning)' : 'var(--hh-muted)'} truncate>
                              {linhaHistorico(h)}
                            </Text>
                          </Box>
                          {h && <Text size="xs" c="var(--hh-faint)" style={{ flexShrink: 0 }}>{ordinal(h.total + 1)}</Text>}
                        </Group>
                      </UnstyledButton>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </ScrollArea>
        </Box>

        {/* ── Detalhe ── */}
        <Box style={{ minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {erro && (
            <Text size="sm" c="var(--hh-negative)" px="lg" pt="md">{erro}</Text>
          )}
          {selecionado ? (
            <Detalhe
              key={selecionado.id}
              paciente={selecionado}
              resumo={historico[selecionado.id]}
              agora={agora}
              onAdmitir={admitir}
              admitindo={admitindo}
              senha={senha}
            />
          ) : (
            <Box p="xl" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} className="hh-fade">
              <Text size="md" fw={600} c="var(--hh-ink)">Escolha um paciente</Text>
              <Text size="sm" c="var(--hh-muted)" mt={4} maw={360}>
                O histórico de visitas, as alergias e o desfecho da última passagem aparecem aqui antes de você admitir.
              </Text>
              {admitidos.length > 0 && (
                <Button variant="default" mt="lg" w="fit-content" onClick={onClose}>
                  Concluir ({admitidos.length} {admitidos.length === 1 ? 'admitido' : 'admitidos'})
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Modal>
  );
}
