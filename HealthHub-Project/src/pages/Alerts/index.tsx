import { useEffect, useState } from 'react';
import {
  Grid, Paper, Text, Group, Badge, Button, Stack,
  ThemeIcon, Box, ScrollArea, Modal, TextInput, Textarea,
  Loader, Center, ActionIcon, Tooltip, Divider,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconUserPlus, IconStethoscope, IconHeartRateMonitor, IconBed,
  IconArrowRight, IconClock, IconRefresh, IconSearch, IconPlus,
  IconX, IconDownload, IconClipboardText,
} from '@tabler/icons-react';
import { PageShell } from '../../components/PageShell';
import api from '../../services/api';
import type { Patient } from '../../types/patient';
import { useCare } from '../../context/CareContext';
import type { Gravidade, FilaPaciente } from '../../context/CareContext';
import { useAuth } from '../../context/AuthContext';
import jsPDF from 'jspdf';

type Role = 'Recepcionista' | 'Enfermeiro' | 'Médico';

const ROLE_MAP: Record<string, Role> = {
  medico: 'Médico',
  enfermeiro: 'Enfermeiro',
  recepcionista: 'Recepcionista',
};

const COLUMN_HEIGHT = 'calc(100dvh - 220px)';

let senhaCounter = 1;
function gerarSenha(prefix: string): string {
  const num = String(senhaCounter++).padStart(3, '0');
  return `${prefix}-${num}`;
}

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

// ─── Coluna do Kanban ─────────────────────────────────────────────────────────
function WorkflowColumn({ title, count, color, icon, children }: {
  title: string; count: number; color: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <Paper withBorder radius="lg" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid oklch(0.90 0.01 220)' }}>
      <Box
        p="sm"
        style={{
          background: 'oklch(0.24 0.02 240)',
          borderBottom: '3px solid oklch(0.32 0.02 240)',
        }}
      >
        <Group justify="space-between">
          <Group gap="xs">
            <ThemeIcon color={color} size="sm" radius="md" variant="light">{icon}</ThemeIcon>
            <Text fw={700} size="sm" c="white" style={{ fontFamily: "'Manrope', sans-serif" }}>{title}</Text>
          </Group>
          <Badge color={color} size="sm" variant="light" radius="md">{count}</Badge>
        </Group>
      </Box>
      <ScrollArea style={{ flex: 1, height: COLUMN_HEIGHT }} p="sm" bg="slate.0">
        {children}
      </ScrollArea>
    </Paper>
  );
}

// ─── Card de paciente ─────────────────────────────────────────────────────────
function PatientCard({ patient, borderColor, footer }: {
  patient: FilaPaciente; borderColor: string; footer: React.ReactNode;
}) {
  return (
    <Paper
      radius="md"
      style={{
        border: '1px solid oklch(0.90 0.01 220)',
        background: '#fff',
      }}
    >
      <Box p="sm">
        <Group justify="space-between" mb={6}>
          <Box>
            <Text fw={700} size="sm" c="slate.8">
              {patient.nome || <Text span c="dimmed" fs="italic">Sem nome</Text>}
            </Text>
            <Text size="xs" c="dimmed">
              {patient.idade ? `${patient.idade} anos` : '—'} · Senha:{' '}
              <Text span ff="monospace" fw={700} c="slate.7">{patient.senha}</Text>
            </Text>
          </Box>
          <Badge size="xs" variant="light" color="slate" radius="sm">{patient.status}</Badge>
        </Group>
        <Group gap={4} pt="xs" style={{ borderTop: '1px solid oklch(0.94 0.005 220)' }}>
          <IconClock size={11} color="oklch(0.65 0.02 230)" />
          <Text size="10px" c="dimmed">Chegada: {patient.chegada}</Text>
        </Group>
      </Box>
      <Box px="sm" pb="sm">{footer}</Box>
    </Paper>
  );
}

// ─── Modal: Admitir Paciente ──────────────────────────────────────────────────
function AdmitirModal({ opened, onClose, onAdmit, filaIds }: {
  opened: boolean; onClose: () => void; onAdmit: (patient: Patient) => void; filaIds: string[];
}) {
  const [dbPatients, setDbPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!opened) return;
    setLoading(true);
    api.get('/patients').then((res) => setDbPatients(res.data as Patient[])).catch(() => {}).finally(() => setLoading(false));
  }, [opened]);

  const filtered = dbPatients.filter(
    (p) => !filaIds.includes(p.id) && (p.nome_completo || '').toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon size="sm" color="slate" variant="light" radius="md"><IconUserPlus size={13} /></ThemeIcon>
          <Text fw={700} size="sm">Admitir Paciente na Esteira</Text>
        </Group>
      }
      centered radius="lg" size="md"
    >
      <TextInput
        placeholder="Buscar por nome..."
        leftSection={<IconSearch size={14} />}
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        mb="sm"
        radius="md"
      />
      {loading ? (
        <Center py="xl"><Loader size="sm" color="slate" type="dots" /></Center>
      ) : filtered.length === 0 ? (
        <Text size="xs" c="dimmed" ta="center" py="xl">
          {dbPatients.length === 0 ? 'Nenhum paciente cadastrado.' : 'Todos já estão na esteira ou não encontrados.'}
        </Text>
      ) : (
        <Stack gap="xs" mah={340} style={{ overflowY: 'auto' }}>
          {filtered.map((p) => (
            <Group
              key={p.id}
              justify="space-between"
              px="sm"
              py={8}
              style={{
                border: '1px solid oklch(0.90 0.01 220)',
                borderRadius: 10,
                background: 'var(--mantine-color-slate-0)',
              }}
            >
              <Box>
                <Text fw={600} size="sm" c="slate.8">
                  {p.nome_completo || <Text span c="dimmed" fs="italic">Sem nome</Text>}
                </Text>
                <Text size="xs" c="dimmed">
                  {[p.idade ? `${p.idade} anos` : null, p.sexo].filter(Boolean).join(' · ')}
                </Text>
              </Box>
              <Button size="xs" color="slate" leftSection={<IconPlus size={12} />} onClick={() => { onAdmit(p); onClose(); }}>
                Admitir
              </Button>
            </Group>
          ))}
        </Stack>
      )}
    </Modal>
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
    <Modal opened={opened} onClose={onClose} withCloseButton={false} centered size="lg" radius="lg" padding={0}>
      <Box
        p="lg"
        style={{ background: 'oklch(0.24 0.02 240)' }}
      >
        <Group gap="sm">
          <ThemeIcon size="lg" radius="md" variant="light" color="gray">
            <IconClipboardText size={20} />
          </ThemeIcon>
          <Box>
            <Text fw={700} c="white" size="lg" style={{ fontFamily: "'Manrope', sans-serif" }}>Alta do Paciente</Text>
            <Text size="xs" style={{ color: 'oklch(0.65 0.03 230)', fontFamily: "'IBM Plex Mono', monospace" }}>
              {patient?.nome || 'Paciente'} · Senha: {patient?.senha}
            </Text>
          </Box>
        </Group>
      </Box>

      <Box p="lg" bg="white">
        <Stack gap="md">
          <Textarea
            label="Medicamentos e Orientações ao Paciente"
            description="Prescrição para uso domiciliar após a alta"
            placeholder="Ex: Paracetamol 500mg — 1 comprimido de 8/8h por 5 dias..."
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
        <Divider my="md" color="oklch(0.92 0.01 220)" />
        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" color="gray" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="outline" color="slate" loading={saving} onClick={() => handleConfirm(false)}>
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
  const { carePatients: patients, loading, admitirPaciente, avançarFluxo, removerPaciente } = useCare();
  const [admitirOpened, { open: openAdmitir, close: closeAdmitir }] = useDisclosure(false);
  const [altaTarget, setAltaTarget] = useState<FilaPaciente | null>(null);

  const filaIds = patients.map((p) => p.paciente_id);

  const handleAdmitir = async (dbPatient: Patient) => {
    const senha = gerarSenha('PR');
    await admitirPaciente(dbPatient, senha);
  };

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
    MANCHESTER.find((m) => m.g === g)?.oklch ?? 'var(--mantine-color-slate-3)';

  if (loading) {
    return (
      <Center style={{ height: '60vh' }}>
        <Stack align="center" gap="xs">
          <Loader color="slate" type="dots" />
          <Text size="xs" c="dimmed">Carregando esteira...</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <PageShell
      title="Esteira de Cuidado"
      description="Recepção → Triagem → Atendimento Médico → Observação"
      icon={<IconHeartRateMonitor size={24} />}
      actions={
        <Group gap="xs">
          <Paper withBorder px="sm" py={6} radius="md" style={{ border: '1px solid oklch(0.90 0.01 220)' }}>
            <Group gap="xs">
              <Text size="xs" fw={700} c="slate.5" style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}>
                VISÃO:
              </Text>
              <Badge color="slate" size="sm" variant="light" radius="sm">{currentRole}</Badge>
            </Group>
          </Paper>
          <Button size="sm" color="slate" leftSection={<IconUserPlus size={16} />} radius="md" onClick={openAdmitir}>
            Admitir Paciente
          </Button>
        </Group>
      }
    >
      <AdmitirModal opened={admitirOpened} onClose={closeAdmitir} onAdmit={handleAdmitir} filaIds={filaIds} />
      <AltaModal
        patient={altaTarget}
        opened={!!altaTarget}
        onClose={() => setAltaTarget(null)}
        onConfirm={handleAltaConfirm}
        medicoNome={nome ?? 'Médico'}
      />

      <Grid gutter="md" style={{ flex: 1, minHeight: 0 }}>

        {/* ── Coluna 1: Recepção & Triagem ── */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <WorkflowColumn title="1. Recepção & Triagem" count={aguardandoTriagem.length} color="blue" icon={<IconUserPlus size={14} />}>
            <Stack gap="xs">
              {aguardandoTriagem.map((p) => (
                <PatientCard
                  key={p.id}
                  patient={p}
                  borderColor="oklch(0.55 0.13 235)"
                  footer={
                    <Group gap={4} justify="space-between" w="100%">
                      <Box>
                        {p.status === 'Aguardando Triagem' && currentRole === 'Enfermeiro' && (
                          <Button
                            size="xs" color="blue" variant="light" radius="md"
                            rightSection={<IconRefresh size={12} />}
                            onClick={() => avançarFluxo(p.id, 'Em Triagem (Enfermeiro)')}
                          >
                            Iniciar Triagem
                          </Button>
                        )}
                        {p.status === 'Em Triagem (Enfermeiro)' && currentRole === 'Enfermeiro' && (
                          <Stack gap={6}>
                            <Text size="10px" c="slate.5" fw={700} style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}>
                              ESCALA DE MANCHESTER:
                            </Text>
                            <Stack gap={4}>
                              {MANCHESTER.map(({ g, label, mantine, tempo }) => (
                                <Button
                                  key={g}
                                  size="xs"
                                  color={mantine}
                                  variant="filled"
                                  radius="md"
                                  justify="space-between"
                                  rightSection={
                                    <Text size="9px" style={{ opacity: 0.8 }}>{tempo}</Text>
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
                      <Tooltip label="Remover da esteira" withArrow>
                        <ActionIcon size="xs" color="gray" variant="subtle" onClick={() => removerPaciente(p.id)}>
                          <IconX size={12} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  }
                />
              ))}
              {aguardandoTriagem.length === 0 && (
                <Text size="xs" c="dimmed" ta="center" py="xl">Nenhum paciente nesta etapa.</Text>
              )}
            </Stack>
          </WorkflowColumn>
        </Grid.Col>

        {/* ── Coluna 2: Atendimento Médico ── */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <WorkflowColumn title="2. Atendimento Médico" count={aguardandoMedico.length} color="teal" icon={<IconStethoscope size={14} />}>
            <Stack gap="xs">
              {aguardandoMedico.map((p) => (
                <PatientCard
                  key={p.id}
                  patient={p}
                  borderColor={riskBorderColor(p.gravidade)}
                  footer={
                    <Group gap={4} justify="space-between" w="100%">
                      <Box>
                        {p.gravidade && (
                          <Badge size="xs" color={badgeColor(p.gravidade)} mb={4} radius="sm">
                            Risco: {p.gravidade}
                          </Badge>
                        )}
                        {p.status === 'Aguardando Atendimento' && currentRole === 'Médico' && (
                          <Button
                            size="xs" color="teal" radius="md"
                            rightSection={<IconArrowRight size={12} />}
                            onClick={() => avançarFluxo(p.id, 'Em Consulta (Médico)')}
                          >
                            Chamar
                          </Button>
                        )}
                        {p.status === 'Em Consulta (Médico)' && currentRole === 'Médico' && (
                          <Group gap="xs">
                            <Button
                              size="xs" variant="light" color="blue" radius="md"
                              leftSection={<IconBed size={12} />}
                              onClick={() => avançarFluxo(p.id, 'Em Observação')}
                            >
                              Observação
                            </Button>
                            <Button
                              size="xs" color="teal" radius="md"
                              leftSection={<IconDownload size={12} />}
                              onClick={() => setAltaTarget(p)}
                            >
                              Alta
                            </Button>
                          </Group>
                        )}
                      </Box>
                      <Tooltip label="Remover da esteira" withArrow>
                        <ActionIcon size="xs" color="gray" variant="subtle" onClick={() => removerPaciente(p.id)}>
                          <IconX size={12} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  }
                />
              ))}
              {aguardandoMedico.length === 0 && (
                <Text size="xs" c="dimmed" ta="center" py="xl">Nenhum paciente nesta etapa.</Text>
              )}
            </Stack>
          </WorkflowColumn>
        </Grid.Col>

        {/* ── Coluna 3: Ala de Observação ── */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <WorkflowColumn title="3. Ala de Observação" count={emObservacao.length} color="indigo" icon={<IconBed size={14} />}>
            <Stack gap="xs">
              {emObservacao.map((p) => (
                <PatientCard
                  key={p.id}
                  patient={p}
                  borderColor="var(--mantine-color-indigo-5)"
                  footer={
                    (currentRole === 'Médico' || currentRole === 'Enfermeiro') ? (
                      <Button
                        size="xs" color="indigo" variant="light" radius="md"
                        onClick={() => avançarFluxo(p.id, 'Alta')}
                      >
                        Liberar Alta
                      </Button>
                    ) : null
                  }
                />
              ))}
              {emObservacao.length === 0 && (
                <Text size="xs" c="dimmed" ta="center" py="xl">Nenhum paciente nesta etapa.</Text>
              )}
            </Stack>
          </WorkflowColumn>
        </Grid.Col>

      </Grid>
    </PageShell>
  );
};
