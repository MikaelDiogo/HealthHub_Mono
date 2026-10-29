import { useState } from 'react';
import {
  Grid, Paper, Text, Group, Badge, Button, Stack,
  Box, ScrollArea, Modal, Textarea,
  ActionIcon, Tooltip, Divider,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconUserPlus, IconHeartRateMonitor, IconBed,
  IconArrowRight, IconRefresh,
  IconX, IconDownload,
} from '@tabler/icons-react';
import { PageShell } from '../../components/PageShell';
import { AdmitirModal } from '../../components/AdmitirModal';
import { AvisoErro, EmptyState, LoadingState, useAviso } from '../../components/ui';
import { mensagemErro } from '../../utils/erro';
import { useCare } from '../../context/CareContext';
import type { Gravidade, FilaPaciente } from '../../context/CareContext';
import { useAuth } from '../../context/AuthContext';
import { useAgora, useHistoricoPacientes } from '../../hooks/useMetricas';
import { formatDuracao, ordinal } from '../../services/metricas';
import jsPDF from 'jspdf';

type Role = 'Recepcionista' | 'Enfermeiro' | 'Médico';

const ROLE_MAP: Record<string, Role> = {
  medico: 'Médico',
  enfermeiro: 'Enfermeiro',
  recepcionista: 'Recepcionista',
};

const COLUMN_HEIGHT = 'calc(100dvh - 220px)';

// ─── PDF: Guia de Alta / Prescrição ───────────────────────────────────────────
function gerarPDFAltaMedica(patient: FilaPaciente, prescricao: string, orientacoes: string, medicoNome: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210; const pageH = 297; const margin = 16; const contentW = pageW - margin * 2;
  const navy    = [15, 23, 42] as [number, number, number];
  const teal    = [13, 148, 136] as [number, number, number];
  const tealBg  = [204, 251, 241] as [number, number, number];
  const white   = [255, 255, 255] as [number, number, number];
  const slate50 = [248, 250, 252] as [number, number, number];
  const dark    = [15, 23, 42] as [number, number, number];
  const mid     = [100, 116, 139] as [number, number, number];
  doc.setFillColor(...navy); doc.rect(0, 0, pageW, 34, 'F');
  doc.setFillColor(...teal); doc.rect(0, 34, pageW, 3, 'F');
  doc.setFillColor(255, 255, 255); doc.roundedRect(margin, 7, 20, 20, 2, 2, 'FD');
  doc.setTextColor(...teal); doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.text('HH', margin + 5, 19);
  doc.setTextColor(...white); doc.setFontSize(15); doc.setFont('helvetica', 'bold'); doc.text('HealthHub', margin + 26, 17);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.text('Sistemas Hospitalares — Documento Médico Oficial', margin + 26, 24);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...teal);
  doc.text('GUIA DE ALTA / PRESCRIÇÃO', pageW - margin, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...white);
  const d = new Date();
  doc.text(`${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pageW - margin, 22, { align: 'right' });
  let y = 44;
  doc.setFillColor(...slate50); doc.roundedRect(margin, y, contentW, 20, 3, 3, 'F');
  doc.setFillColor(...teal); doc.roundedRect(margin, y, 4, 20, 2, 2, 'F');
  doc.setTextColor(...dark); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text(patient.nome || 'Paciente sem identificação', margin + 10, y + 9);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...mid);
  doc.text(`Idade: ${patient.idade ?? '—'}   ·   Senha: ${patient.senha}   ·   Chegada: ${patient.chegada}`, margin + 10, y + 15);
  y += 26;
  const drawBloco = (titulo: string, conteudo: string) => {
    const lines = doc.splitTextToSize(conteudo.trim() || '—', contentW - 8);
    const blockH = lines.length * 5.5 + 10;
    if (y + 12 + blockH > pageH - 20) { doc.addPage(); y = 20; }
    doc.setFillColor(...tealBg); doc.roundedRect(margin, y, contentW, 9, 2, 2, 'F');
    doc.setDrawColor(...teal); doc.setLineWidth(0.4); doc.roundedRect(margin, y, contentW, 9, 2, 2, 'S');
    doc.setTextColor(...teal); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.text(titulo.toUpperCase(), margin + 4, y + 6);
    y += 12;
    doc.setFillColor(...slate50); doc.roundedRect(margin, y - 2, contentW, blockH, 2, 2, 'F');
    doc.setTextColor(...dark); doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text(lines, margin + 4, y + 4);
    y += blockH + 6;
  };
  drawBloco('Orientações e Medicamentos ao Paciente', prescricao);
  drawBloco('Orientações à Equipe de Enfermagem', orientacoes);
  y = Math.max(y + 20, pageH - 55);
  doc.setDrawColor(...mid); doc.setLineWidth(0.3); doc.line(margin, y, margin + 90, y);
  doc.setTextColor(...mid); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  doc.text('Assinatura do Médico Responsável', margin, y + 5);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...dark); doc.text(medicoNome, margin, y + 12);
  doc.setFillColor(...navy); doc.rect(0, pageH - 12, pageW, 12, 'F');
  doc.setFillColor(...teal); doc.rect(0, pageH - 12, pageW, 1, 'F');
  doc.setTextColor(...white); doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
  doc.text('HealthHub — Documento confidencial de uso exclusivo hospitalar.', pageW / 2, pageH - 4.5, { align: 'center' });
  doc.save(`guia_alta_${(patient.nome || 'paciente').replace(/\s+/g, '_')}.pdf`);
}

// ─── Coluna da esteira ────────────────────────────────────────────────────────
function WorkflowColumn({ title, count, children }: {
  title: string; count: number; children: React.ReactNode;
}) {
  return (
    <Paper withBorder style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Group justify="space-between" px="md" py="sm" style={{ borderBottom: '1px solid var(--hh-border)' }}>
        <Text fw={600} size="sm" component="h2" c="var(--hh-ink)">{title}</Text>
        <Text size="sm" c="var(--hh-muted)" aria-label={`${count} paciente(s)`}>{count}</Text>
      </Group>
      <ScrollArea style={{ flex: 1, height: COLUMN_HEIGHT }} p="sm" bg="var(--hh-raised)">
        {children}
      </ScrollArea>
    </Paper>
  );
}

// ─── Card de paciente ─────────────────────────────────────────────────────────
// A faixa lateral é a categoria de risco (dado); sem categoria, fica neutra.
// Espera ao vivo: só conta para quem está aguardando (triagem ou médico).
const AGUARDANDO = new Set(['Aguardando Triagem', 'Aguardando Atendimento']);

function PatientCard({ patient, borderColor, footer, agora, visita }: {
  patient: FilaPaciente; borderColor: string; footer: React.ReactNode; agora: Date; visita?: number;
}) {
  const desde = patient.created_at
    ? Math.max(0, Math.round((agora.getTime() - new Date(patient.created_at).getTime()) / 60_000))
    : null;
  const aguarda = AGUARDANDO.has(patient.status);
  const longa = aguarda && desde !== null && desde >= 30;
  return (
    <Paper withBorder className="hh-interactive" style={{ borderLeft: `3px solid ${borderColor}`, background: 'var(--hh-surface)' }}>
      <Box p="sm">
        <Group justify="space-between" mb={6} wrap="nowrap" align="flex-start">
          <Box style={{ minWidth: 0 }}>
            <Text fw={600} size="sm" c="var(--hh-ink)" truncate>
              {patient.nome || <Text span c="var(--hh-faint)" fs="italic">Sem nome</Text>}
            </Text>
            <Text size="xs" c="var(--hh-muted)">
              {patient.idade ? `${patient.idade} anos` : '—'} · Senha{' '}
              <Text span ff="monospace" fw={600} c="var(--hh-ink)" style={{ whiteSpace: 'nowrap' }}>{patient.senha}</Text>
            </Text>
          </Box>
          <Badge size="sm" variant="light" color="slate" style={{ flexShrink: 0 }}>{patient.status}</Badge>
        </Group>
        <Group justify="space-between" gap="xs" pt="xs" wrap="nowrap" style={{ borderTop: '1px solid var(--hh-rule)' }}>
          <Text size="xs" c={longa ? 'var(--hh-warning)' : 'var(--hh-muted)'} fw={longa ? 600 : 400} truncate>
            {desde === null
              ? `Chegada ${patient.chegada}`
              : `${aguarda ? 'Aguardando há' : 'Na esteira há'} ${formatDuracao(desde)}`}
          </Text>
          {visita && visita > 1 && (
            <Text size="xs" c="var(--hh-muted)" style={{ whiteSpace: 'nowrap' }}>
              Retorno · {ordinal(visita)} visita
            </Text>
          )}
        </Group>
      </Box>
      <Box px="sm" pb="sm">{footer}</Box>
    </Paper>
  );
}

// ─── Modal: Alta Médica ───────────────────────────────────────────────────────
function AltaModal({ patient, opened, onClose, onConfirm, medicoNome }: {
  patient: FilaPaciente | null;
  opened: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  medicoNome: string;
}) {
  const [prescricao, setPrescricao] = useState('');
  const [orientacoes, setOrientacoes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async (withPDF: boolean) => {
    setSaving(true);
    try {
      if (withPDF && patient) gerarPDFAltaMedica(patient, prescricao, orientacoes, medicoNome);
      await onConfirm();
      setPrescricao(''); setOrientacoes('');
    } finally { setSaving(false); }
  };

  return (
    <Modal opened={opened} onClose={onClose} withCloseButton={false} centered size="lg" padding={0}>
      <Box p="lg" style={{ borderBottom: '1px solid var(--hh-border)' }}>
        <Text fw={600} size="lg" c="var(--hh-ink)">Alta do paciente</Text>
        <Text size="sm" c="var(--hh-muted)">
          {patient?.nome || 'Paciente'} · Senha <Text span ff="monospace" inherit>{patient?.senha}</Text>
        </Text>
      </Box>

      <Box p="lg">
        <Stack gap="md">
          <Textarea
            label="Medicamentos e Orientações ao Paciente"
            description="Prescrição para uso domiciliar após a alta"
            placeholder="Ex: Paracetamol 500mg, 1 comprimido de 8/8h por 5 dias..."
            minRows={4}
            radius="md"
            value={prescricao}
            onChange={(e) => setPrescricao(e.currentTarget.value)}
          />
          <Textarea
            label="Orientações à Equipe de Enfermagem"
            description="Medicamentos ou procedimentos hospitalares antes da saída"
            placeholder="Ex: Aplicar Dipirona 500mg EV se febre. Verificar sinais vitais antes da alta..."
            minRows={4}
            radius="md"
            value={orientacoes}
            onChange={(e) => setOrientacoes(e.currentTarget.value)}
          />
        </Stack>
        <Divider my="md" color="var(--hh-border)" />
        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" color="gray" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="default" loading={saving} onClick={() => handleConfirm(false)}>
            Dar Alta sem PDF
          </Button>
          <Button color="slate" leftSection={<IconDownload size={14} />} loading={saving} onClick={() => handleConfirm(true)}>
            Exportar Guia e Dar Alta
          </Button>
        </Group>
      </Box>
    </Modal>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export const Alerts = () => {
  const { role, nome } = useAuth();
  const currentRole: Role = ROLE_MAP[role ?? ''] ?? 'Recepcionista';
  const { carePatients: patients, loading, avançarFluxo: avançarCtx, removerPaciente: removerCtx } = useCare();
  const [aviso, mostrarAviso] = useAviso();
  // Toda ação da esteira mostra na tela o motivo quando o backend recusa (antes o erro ficava só no console)
  const avançarFluxo: typeof avançarCtx = async (...a) => {
    try { await avançarCtx(...a); mostrarAviso(null); } catch (e) { mostrarAviso(mensagemErro(e)); }
  };
  const removerPaciente: typeof removerCtx = async (...a) => {
    try { await removerCtx(...a); mostrarAviso(null); } catch (e) { mostrarAviso(mensagemErro(e)); }
  };
  const [admitirOpened, { open: openAdmitir, close: closeAdmitir }] = useDisclosure(false);
  const [altaTarget, setAltaTarget] = useState<FilaPaciente | null>(null);
  const agora = useAgora();
  const { historico } = useHistoricoPacientes();
  // A visita atual já conta no histórico (é criada na admissão)
  const visitaDe = (p: FilaPaciente) => historico[p.paciente_id]?.total;

  const handleAltaConfirm = async () => {
    if (altaTarget) await avançarFluxo(altaTarget.id, 'Alta');
    setAltaTarget(null);
  };

  const aguardandoTriagem = patients.filter(
    (p) => p.status === 'Aguardando Triagem' || p.status === 'Em Triagem (Enfermeiro)',
  );
  const aguardandoMedico = patients.filter(
    (p) => p.status === 'Aguardando Atendimento' || p.status === 'Em Consulta (Médico)',
  );
  const emObservacao = patients.filter((p) => p.status === 'Em Observação');

  // Escala de Manchester — 5 níveis
  const MANCHESTER: { g: Gravidade; label: string; mantine: string; oklch: string; tempo: string }[] = [
    { g: 'Vermelho', label: 'Vermelho',  mantine: 'red',    oklch: 'oklch(0.55 0.21 25)',  tempo: 'Imediato' },
    { g: 'Laranja',  label: 'Laranja',   mantine: 'orange', oklch: 'oklch(0.68 0.18 45)',  tempo: '10 min' },
    { g: 'Amarelo',  label: 'Amarelo',   mantine: 'yellow', oklch: 'oklch(0.82 0.15 90)',  tempo: '60 min' },
    { g: 'Verde',    label: 'Verde',     mantine: 'green',  oklch: 'oklch(0.68 0.14 150)', tempo: '120 min' },
    { g: 'Azul',     label: 'Azul',      mantine: 'blue',   oklch: 'oklch(0.55 0.13 240)', tempo: '240 min' },
  ];

  const badgeColor = (g?: Gravidade) =>
    MANCHESTER.find((m) => m.g === g)?.mantine ?? 'gray';

  const riskBorderColor = (g?: Gravidade) =>
    MANCHESTER.find((m) => m.g === g)?.oklch ?? 'var(--hh-control)';

  if (loading) {
    return (
      <PageShell title="Esteira de Cuidado" description="Carregando a esteira…">
        <LoadingState rows={4} rowHeight={72} />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Esteira de Cuidado"
      description="Recepção → Triagem → Atendimento Médico → Observação"
      icon={<IconHeartRateMonitor size={22} />}
      actions={
        <Group gap="xs">
          <Text size="sm" c="var(--hh-muted)">
            Visão: <Text span fw={600} c="var(--hh-ink)" inherit>{currentRole}</Text>
          </Text>
          <Button size="sm" color="slate" leftSection={<IconUserPlus size={16} />} onClick={openAdmitir}>
            Admitir Paciente
          </Button>
        </Group>
      }
    >
      <AdmitirModal opened={admitirOpened} onClose={closeAdmitir} />
      <AltaModal
        patient={altaTarget}
        opened={!!altaTarget}
        onClose={() => setAltaTarget(null)}
        onConfirm={handleAltaConfirm}
        medicoNome={nome ?? 'Médico'}
      />

      <AvisoErro flutuante mensagem={aviso} onFechar={() => mostrarAviso(null)} mb="0" />

      <Grid gutter="md" style={{ flex: 1, minHeight: 0 }}>

        {/* ── Coluna 1: Recepção & Triagem ── */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <WorkflowColumn title="Recepção e triagem" count={aguardandoTriagem.length}>
            <Stack gap="xs" className="hh-stagger">
              {aguardandoTriagem.map((p) => (
                <PatientCard
                  key={p.id}
                  patient={p}
                  agora={agora}
                  visita={visitaDe(p)}
                  borderColor="var(--hh-control)"
                  footer={
                    <Group gap={4} justify="space-between" w="100%">
                      <Box>
                        {p.status === 'Aguardando Triagem' && currentRole === 'Enfermeiro' && (
                          <Button
                            size="xs" variant="default"
                            rightSection={<IconRefresh size={12} />}
                            onClick={() => avançarFluxo(p.id, 'Em Triagem (Enfermeiro)')}
                          >
                            Iniciar Triagem
                          </Button>
                        )}
                        {p.status === 'Em Triagem (Enfermeiro)' && currentRole === 'Enfermeiro' && (
                          <Stack gap={6}>
                            <Text size="xs" c="var(--hh-muted)">Classificar risco (Manchester)</Text>
                            <Stack gap={4}>
                              {MANCHESTER.map(({ g, label, mantine, tempo }) => (
                                <Button
                                  key={g}
                                  size="xs"
                                  color={mantine}
                                  variant="filled"
                                  justify="space-between"
                                  rightSection={
                                    <Text size="xs" style={{ opacity: 0.9 }}>{tempo}</Text>
                                  }
                                  onClick={() => avançarFluxo(p.id, 'Aguardando Atendimento', g)}
                                  fullWidth
                                >
                                  {label}
                                </Button>
                              ))}
                            </Stack>
                          </Stack>
                        )}
                      </Box>
                      {/* Só o médico pode remover da esteira (o backend recusa os outros perfis) */}
                      {currentRole === 'Médico' && (
                        <Tooltip label="Remover da esteira" withArrow>
                          <ActionIcon size="sm" color="slate" variant="subtle" aria-label="Remover da esteira" onClick={() => removerPaciente(p.id)}>
                            <IconX size={12} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  }
                />
              ))}
              {aguardandoTriagem.length === 0 && (
                <EmptyState message="Nenhum paciente nesta etapa." />
              )}
            </Stack>
          </WorkflowColumn>
        </Grid.Col>

        {/* ── Coluna 2: Atendimento Médico ── */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <WorkflowColumn title="Atendimento médico" count={aguardandoMedico.length}>
            <Stack gap="xs" className="hh-stagger">
              {aguardandoMedico.map((p) => (
                <PatientCard
                  key={p.id}
                  patient={p}
                  agora={agora}
                  visita={visitaDe(p)}
                  borderColor={riskBorderColor(p.gravidade)}
                  footer={
                    <Group gap={4} justify="space-between" w="100%">
                      <Box>
                        {p.gravidade && (
                          <Badge size="sm" color={badgeColor(p.gravidade)} mb={4}>
                            Risco: {p.gravidade}
                          </Badge>
                        )}
                        {p.status === 'Aguardando Atendimento' && currentRole === 'Médico' && (
                          <Button
                            size="xs" variant="default"
                            rightSection={<IconArrowRight size={12} />}
                            onClick={() => avançarFluxo(p.id, 'Em Consulta (Médico)')}
                          >
                            Chamar
                          </Button>
                        )}
                        {p.status === 'Em Consulta (Médico)' && currentRole === 'Médico' && (
                          <Group gap="xs">
                            <Button
                              size="xs" variant="default"
                              leftSection={<IconBed size={12} />}
                              onClick={() => avançarFluxo(p.id, 'Em Observação')}
                            >
                              Observação
                            </Button>
                            <Button
                              size="xs" variant="default"
                              leftSection={<IconDownload size={12} />}
                              onClick={() => setAltaTarget(p)}
                            >
                              Alta
                            </Button>
                          </Group>
                        )}
                      </Box>
                      {/* Só o médico pode remover da esteira (o backend recusa os outros perfis) */}
                      {currentRole === 'Médico' && (
                        <Tooltip label="Remover da esteira" withArrow>
                          <ActionIcon size="sm" color="slate" variant="subtle" aria-label="Remover da esteira" onClick={() => removerPaciente(p.id)}>
                            <IconX size={12} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  }
                />
              ))}
              {aguardandoMedico.length === 0 && (
                <EmptyState message="Nenhum paciente nesta etapa." />
              )}
            </Stack>
          </WorkflowColumn>
        </Grid.Col>

        {/* ── Coluna 3: Ala de Observação ── */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <WorkflowColumn title="Ala de observação" count={emObservacao.length}>
            <Stack gap="xs" className="hh-stagger">
              {emObservacao.map((p) => (
                <PatientCard
                  key={p.id}
                  patient={p}
                  agora={agora}
                  visita={visitaDe(p)}
                  borderColor="var(--hh-control)"
                  footer={
                    // Alta clínica: só o médico (PATCH /fila/:id/alta é restrito a esse perfil no backend)
                    currentRole === 'Médico' ? (
                      <Button
                        size="xs" variant="default"
                        onClick={() => avançarFluxo(p.id, 'Alta')}
                      >
                        Liberar Alta
                      </Button>
                    ) : null
                  }
                />
              ))}
              {emObservacao.length === 0 && (
                <EmptyState message="Nenhum paciente nesta etapa." />
              )}
            </Stack>
          </WorkflowColumn>
        </Grid.Col>

      </Grid>
    </PageShell>
  );
};
