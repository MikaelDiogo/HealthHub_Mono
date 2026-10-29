import { useState } from 'react';
import {
  Box,
  Text,
  Group,
  Stack,
  TextInput,
  Textarea,
  NumberInput,
  Button,
  Paper,
  Badge,
  Divider,
  ScrollArea,
  Loader,
  Center,
  ThemeIcon,
  Grid,
  Alert,
  Modal,
} from '@mantine/core';
import {
  IconSearch,
  IconFile,
  IconUser,
  IconStethoscope,
  IconHeartbeat,
  IconAlertCircle,
  IconDownload,
  IconClipboardText,
  IconFileCertificate,
  IconPill,
} from '@tabler/icons-react';
import { PageShell } from '../../components/PageShell';
import api from '../../services/api';
import type { Patient, SinalVital } from '../../types/patient';
import jsPDF from 'jspdf';
import { useAuth } from '../../context/AuthContext';

interface PatientWithVitals extends Patient {
  sinaisVitais?: SinalVital[];
}

// ─── Helpers de UI ────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <Group gap="xs" py={4} style={{ borderBottom: '1px solid var(--mantine-color-slate-1)' }}>
      <Text size="xs" fw={700} c="slate.5" w={160} style={{ flexShrink: 0 }}>{label}</Text>
      <Text size="xs" c="slate.8" fw={500}>
        {value || <Text span c="dimmed">Não informado</Text>}
      </Text>
    </Group>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <Group gap="xs" mb="sm">
      <ThemeIcon size="sm" radius="md" color="slate" variant="light">{icon}</ThemeIcon>
      <Text fw={700} size="xs" c="slate.6" tt="uppercase" style={{ fontFamily: "'Manrope', sans-serif", letterSpacing: '0.1em' }}>{title}</Text>
    </Group>
  );
}

// ─── Funções PDF compartilhadas ───────────────────────────────────────────────
function pdfHeader(doc: jsPDF, rightTitle: string) {
  const pageW = 210;
  const margin = 16;
  const navy    = [15, 23, 42] as [number, number, number];
  const teal    = [13, 148, 136] as [number, number, number];
  const white   = [255, 255, 255] as [number, number, number];

  doc.setFillColor(...navy);
  doc.rect(0, 0, pageW, 34, 'F');
  doc.setFillColor(...teal);
  doc.rect(0, 34, pageW, 3, 'F');
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 7, 20, 20, 2, 2, 'FD');
  doc.setTextColor(...teal);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('HH', margin + 5, 19);
  doc.setTextColor(...white);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('HealthHub', margin + 26, 17);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistemas Hospitalares — Documento Médico Oficial', margin + 26, 24);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...teal);
  doc.text(rightTitle, pageW - margin, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...white);
  doc.text(new Date().toLocaleDateString('pt-BR'), pageW - margin, 22, { align: 'right' });
}

function pdfFooter(doc: jsPDF, texto: string) {
  const pageW = 210;
  const pageH = 297;
  const navy = [15, 23, 42] as [number, number, number];
  const teal = [13, 148, 136] as [number, number, number];
  const white = [255, 255, 255] as [number, number, number];
  doc.setFillColor(...navy);
  doc.rect(0, pageH - 12, pageW, 12, 'F');
  doc.setFillColor(...teal);
  doc.rect(0, pageH - 12, pageW, 1, 'F');
  doc.setTextColor(...white);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(texto, pageW / 2, pageH - 4.5, { align: 'center' });
}

// ─── PDF 1: Prontuário Completo ───────────────────────────────────────────────
function gerarPDF(patient: PatientWithVitals) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 16;
  const contentW = pageW - margin * 2;

  const teal    = [13, 148, 136] as [number, number, number];
  const tealBg  = [204, 251, 241] as [number, number, number];
  const slate50 = [248, 250, 252] as [number, number, number];
  const dark    = [15, 23, 42] as [number, number, number];
  const mid     = [100, 116, 139] as [number, number, number];

  pdfHeader(doc, 'PRONTUÁRIO MÉDICO');

  let y = 44;

  doc.setFillColor(...slate50);
  doc.roundedRect(margin, y, contentW, 22, 3, 3, 'F');
  doc.setFillColor(...teal);
  doc.roundedRect(margin, y, 4, 22, 2, 2, 'F');
  doc.setTextColor(...dark);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(patient.nome_completo || 'Paciente sem identificação', margin + 10, y + 9);
  const metaParts = [patient.idade ? `${patient.idade} anos` : null, patient.sexo, patient.cpf ? `CPF: ${patient.cpf}` : null].filter(Boolean).join('   ·   ');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mid);
  doc.text(metaParts || 'Dados pessoais não informados', margin + 10, y + 16);
  y += 28;

  doc.setFontSize(7);
  doc.setTextColor(...mid);
  doc.text(`ID: ${patient.id.slice(0, 8).toUpperCase()}   ·   Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, y);
  y += 8;

  const drawSection = (title: string, rows: [string, string | number | undefined][]) => {
    const rowH = 7.5;
    if (y + 10 + rows.length * rowH + 4 > pageH - 20) { doc.addPage(); y = 20; }
    doc.setFillColor(...tealBg);
    doc.roundedRect(margin, y, contentW, 9, 2, 2, 'F');
    doc.setDrawColor(...teal);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentW, 9, 2, 2, 'S');
    doc.setTextColor(...teal);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), margin + 4, y + 6);
    y += 12;
    for (let i = 0; i < rows.length; i++) {
      const [label, val] = rows[i];
      const display = val !== undefined && val !== null && val !== '' ? String(val) : 'Não informado';
      if (i % 2 === 0) { doc.setFillColor(...slate50); doc.rect(margin, y - 2.5, contentW, rowH, 'F'); }
      doc.setTextColor(...mid);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(label + ':', margin + 3, y + 1.5);
      doc.setTextColor(...dark);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', val ? 'bold' : 'normal');
      doc.text(display, margin + 54, y + 1.5);
      doc.setFont('helvetica', 'normal');
      y += rowH;
    }
    y += 6;
  };

  drawSection('Dados Pessoais', [
    ['Nome Completo', patient.nome_completo],
    ['CPF', patient.cpf],
    ['RG', patient.rg],
    ['Idade', patient.idade ? `${patient.idade} anos` : undefined],
    ['Sexo', patient.sexo],
    ['Telefone', patient.telefone],
    ['Endereço', patient.endereco],
  ]);

  drawSection('Informações Médicas', [
    ['Alergias', patient.alergias],
    ['Medicamentos em Uso', patient.medicamentos_em_uso],
  ]);

  if (patient.anamnese) {
    const lines = doc.splitTextToSize(patient.anamnese, contentW - 8);
    const aH = lines.length * 5 + 8;
    if (y + 10 + aH > pageH - 20) { doc.addPage(); y = 20; }
    doc.setFillColor(...tealBg);
    doc.roundedRect(margin, y, contentW, 9, 2, 2, 'F');
    doc.setDrawColor(...teal);
    doc.roundedRect(margin, y, contentW, 9, 2, 2, 'S');
    doc.setTextColor(...teal);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('ANAMNESE', margin + 4, y + 6);
    y += 13;
    doc.setFillColor(...slate50);
    doc.roundedRect(margin, y - 2, contentW, aH, 2, 2, 'F');
    doc.setTextColor(...dark);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(lines, margin + 4, y + 3);
    y += aH + 10;
  }

  if (patient.sinaisVitais && patient.sinaisVitais.length > 0) {
    const latest = patient.sinaisVitais[patient.sinaisVitais.length - 1];
    const vitais = [
      { label: 'TEMPERATURA', value: latest.temperatura ? `${latest.temperatura} °C` : '—', color: [234, 88, 12] as [number,number,number], bg: [255, 237, 213] as [number,number,number] },
      { label: 'PRESSÃO ARTERIAL', value: latest.pressao_arterial || '—', color: [185, 28, 28] as [number,number,number], bg: [254, 226, 226] as [number,number,number] },
      { label: 'FREQ. CARDÍACA', value: latest.frequencia_cardiaca ? `${latest.frequencia_cardiaca} bpm` : '—', color: [157, 23, 77] as [number,number,number], bg: [253, 242, 248] as [number,number,number] },
      { label: 'SpO₂', value: latest.saturacao_oxigenio ? `${latest.saturacao_oxigenio}%` : '—', color: [29, 78, 216] as [number,number,number], bg: [219, 234, 254] as [number,number,number] },
    ];
    const boxW = (contentW - 9) / 4;
    if (y + 12 + 24 > pageH - 20) { doc.addPage(); y = 20; }
    doc.setFillColor(...tealBg);
    doc.roundedRect(margin, y, contentW, 9, 2, 2, 'F');
    doc.setDrawColor(...teal);
    doc.roundedRect(margin, y, contentW, 9, 2, 2, 'S');
    doc.setTextColor(...teal);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('ÚLTIMO REGISTRO DE SINAIS VITAIS', margin + 4, y + 6);
    y += 12;
    vitais.forEach((v, i) => {
      const x = margin + i * (boxW + 3);
      doc.setFillColor(...v.bg);
      doc.roundedRect(x, y, boxW, 24, 3, 3, 'F');
      doc.setFillColor(...v.color);
      doc.roundedRect(x, y, boxW, 5, 2, 2, 'F');
      doc.setTextColor(...v.color);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text(v.label, x + boxW / 2, y + 12, { align: 'center' });
      doc.setTextColor(...dark);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(v.value, x + boxW / 2, y + 20, { align: 'center' });
    });
    y += 30;
    if (latest.created_at) {
      doc.setTextColor(...mid);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(`Registrado em: ${new Date(latest.created_at).toLocaleString('pt-BR')}`, margin, y);
    }
  }

  y = Math.max(y + 10, pageH - 55);
  doc.setDrawColor(...mid);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + 70, y);
  doc.setTextColor(...mid);
  doc.setFontSize(7);
  doc.text('Assinatura e CRM do Responsável', margin, y + 5);
  doc.line(pageW - margin - 70, y, pageW - margin, y);
  doc.text('Data e Carimbo', pageW - margin - 70, y + 5);

  pdfFooter(doc, 'HealthHub — Documento confidencial de uso exclusivo hospitalar. Gerado automaticamente pelo sistema.');
  doc.save(`prontuario_${(patient.nome_completo || 'paciente').replace(/\s+/g, '_')}.pdf`);
}

// ─── PDF 2: Atestado Médico ───────────────────────────────────────────────────
function gerarPDFAtestado(patient: PatientWithVitals, dias: number, crm: string, medicoNome: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;

  const dark = [15, 23, 42] as [number, number, number];
  const mid  = [100, 116, 139] as [number, number, number];
  const teal = [13, 148, 136] as [number, number, number];

  pdfHeader(doc, 'ATESTADO MÉDICO');

  let y = 70;

  // Título centralizado
  doc.setTextColor(...dark);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ATESTADO MÉDICO', pageW / 2, y, { align: 'center' });
  y += 8;

  // Linha decorativa
  doc.setDrawColor(...teal);
  doc.setLineWidth(1);
  doc.line(margin + 30, y, pageW - margin - 30, y);
  y += 18;

  // Corpo do atestado
  const nomePaciente = patient.nome_completo || 'PACIENTE SEM IDENTIFICAÇÃO';
  const cpfPart = patient.cpf ? `, portador(a) do CPF ${patient.cpf},` : ',';
  const dateStr = new Date().toLocaleDateString('pt-BR');
  const diasLabel = `${dias} (${dias === 1 ? 'um' : dias === 2 ? 'dois' : dias === 3 ? 'três' : String(dias)}) dia${dias > 1 ? 's' : ''}`;

  const paragrafo = `Atesto, para os devidos fins, que o(a) paciente ${nomePaciente}${cpfPart} encontra-se impossibilitado(a) de exercer suas atividades habituais por um período de ${diasLabel}, a contar da data de ${dateStr}.`;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...dark);
  const lines = doc.splitTextToSize(paragrafo, contentW);
  doc.text(lines, margin, y);
  y += lines.length * 7 + 24;

  // Local e data
  doc.setFontSize(11);
  doc.text(`Local e data: _________________________________, ${dateStr}.`, margin, y);
  y += 36;

  // Linha de assinatura
  doc.setDrawColor(...dark);
  doc.setLineWidth(0.4);
  doc.line(margin + 20, y, margin + 130, y);
  y += 7;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(medicoNome, margin + 20, y);
  if (crm.trim()) {
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...mid);
    doc.text(`CRM: ${crm}`, margin + 20, y);
  }

  pdfFooter(doc, 'HealthHub — Valor jurídico sujeito à assinatura e carimbo do médico responsável.');
  doc.save(`atestado_${(patient.nome_completo || 'paciente').replace(/\s+/g, '_')}.pdf`);
}

// ─── PDF 3: Guia de Alta / Prescrição ────────────────────────────────────────
function gerarPDFPrescricao(
  patient: PatientWithVitals,
  prescricao: string,
  orientacoes: string,
  medicoNome: string,
  crm: string,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 16;
  const contentW = pageW - margin * 2;

  const teal    = [13, 148, 136] as [number, number, number];
  const tealBg  = [204, 251, 241] as [number, number, number];
  const slate50 = [248, 250, 252] as [number, number, number];
  const dark    = [15, 23, 42] as [number, number, number];
  const mid     = [100, 116, 139] as [number, number, number];

  pdfHeader(doc, 'GUIA DE ALTA / PRESCRIÇÃO');

  let y = 44;

  // Card do paciente
  doc.setFillColor(...slate50);
  doc.roundedRect(margin, y, contentW, 22, 3, 3, 'F');
  doc.setFillColor(...teal);
  doc.roundedRect(margin, y, 4, 22, 2, 2, 'F');
  doc.setTextColor(...dark);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(patient.nome_completo || 'Paciente sem identificação', margin + 10, y + 9);
  const meta = [patient.idade ? `${patient.idade} anos` : null, patient.sexo, patient.cpf ? `CPF: ${patient.cpf}` : null].filter(Boolean).join('   ·   ');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mid);
  doc.text(meta || '—', margin + 10, y + 16);
  y += 28;

  const drawBloco = (titulo: string, conteudo: string) => {
    if (!conteudo.trim()) return;
    const lines = doc.splitTextToSize(conteudo, contentW - 8);
    const blockH = lines.length * 5.5 + 10;
    if (y + 12 + blockH > pageH - 20) { doc.addPage(); y = 20; }
    doc.setFillColor(...tealBg);
    doc.roundedRect(margin, y, contentW, 9, 2, 2, 'F');
    doc.setDrawColor(...teal);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentW, 9, 2, 2, 'S');
    doc.setTextColor(...teal);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(titulo.toUpperCase(), margin + 4, y + 6);
    y += 12;
    doc.setFillColor(...slate50);
    doc.roundedRect(margin, y - 2, contentW, blockH, 2, 2, 'F');
    doc.setTextColor(...dark);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(lines, margin + 4, y + 4);
    y += blockH + 6;
  };

  drawBloco('Medicamentos e Orientações ao Paciente', prescricao);
  drawBloco('Orientações à Equipe de Enfermagem', orientacoes);

  y = Math.max(y + 20, pageH - 55);
  doc.setDrawColor(...mid);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + 90, y);
  doc.setTextColor(...mid);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Assinatura do Médico Responsável', margin, y + 5);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...dark);
  doc.text(medicoNome, margin, y + 12);
  if (crm.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...mid);
    doc.text(`CRM: ${crm}`, margin, y + 18);
  }

  pdfFooter(doc, 'HealthHub — Documento confidencial de uso exclusivo hospitalar.');
  doc.save(`prescricao_${(patient.nome_completo || 'paciente').replace(/\s+/g, '_')}.pdf`);
}

// ─── Modal: Atestado Médico ───────────────────────────────────────────────────
function AtestadoModal({
  patient, opened, onClose, medicoNome,
}: {
  patient: PatientWithVitals | null;
  opened: boolean;
  onClose: () => void;
  medicoNome: string;
}) {
  const [dias, setDias] = useState<number | string>(1);
  const [crm, setCrm] = useState('');

  const handleGerar = () => {
    if (!patient) return;
    gerarPDFAtestado(patient, Number(dias) || 1, crm, medicoNome);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title={<Group gap="xs"><IconFileCertificate size={18} /><Text fw={700}>Atestado Médico</Text></Group>} centered radius="md" size="md">
      <Stack gap="md">
        <Paper withBorder radius="md" p="sm" bg="slate.0">
          <Text size="sm" fw={600} c="slate.8">{patient?.nome_completo || 'Paciente'}</Text>
          {patient?.cpf && <Text size="xs" c="dimmed">CPF: {patient.cpf}</Text>}
        </Paper>
        <NumberInput
          label="Dias de afastamento"
          description="Quantidade de dias que o paciente ficará afastado"
          placeholder="Ex: 3"
          min={1}
          max={365}
          value={dias}
          onChange={setDias}
          radius="md"
          required
        />
        <TextInput
          label="CRM (opcional)"
          placeholder="Ex: 123456-SP"
          value={crm}
          onChange={(e) => setCrm(e.currentTarget.value)}
          radius="md"
        />
        <Group justify="flex-end" pt="sm">
          <Button variant="subtle" color="gray" onClick={onClose}>Cancelar</Button>
          <Button color="slate" leftSection={<IconDownload size={14} />} onClick={handleGerar} disabled={!dias || Number(dias) < 1}>
            Gerar Atestado PDF
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ─── Modal: Guia de Alta / Prescrição ─────────────────────────────────────────
function PrescricaoModal({
  patient, opened, onClose, medicoNome,
}: {
  patient: PatientWithVitals | null;
  opened: boolean;
  onClose: () => void;
  medicoNome: string;
}) {
  const [prescricao, setPrescricao] = useState('');
  const [orientacoes, setOrientacoes] = useState('');
  const [crm, setCrm] = useState('');

  const handleGerar = () => {
    if (!patient) return;
    gerarPDFPrescricao(patient, prescricao, orientacoes, medicoNome, crm);
    onClose();
    setPrescricao('');
    setOrientacoes('');
  };

  return (
    <Modal opened={opened} onClose={onClose} title={<Group gap="xs"><IconPill size={18} /><Text fw={700}>Guia de Alta / Prescrição</Text></Group>} centered radius="md" size="lg" padding={0}>
      <Box p="lg" style={{ background: 'oklch(0.24 0.02 240)' }}>
        <Text fw={700} c="white" style={{ fontFamily: "'Manrope', sans-serif" }}>{patient?.nome_completo || 'Paciente'}</Text>
        <Text size="xs" style={{ fontFamily: "'Manrope', sans-serif", color: 'oklch(0.65 0.03 230)' }}>Prescrição e orientações ao paciente e à equipe de enfermagem</Text>
      </Box>
      <Box p="lg">
        <Stack gap="md">
          <Textarea
            label="Medicamentos e Orientações ao Paciente"
            description="Prescrição para uso domiciliar após a alta"
            placeholder="Ex: Paracetamol 500mg — 1 comprimido de 8/8h por 5 dias. Retornar se piorar..."
            minRows={4}
            radius="md"
            value={prescricao}
            onChange={(e) => setPrescricao(e.currentTarget.value)}
          />
          <Textarea
            label="Orientações à Equipe de Enfermagem"
            description="Procedimentos ou medicamentos a aplicar no ambiente hospitalar"
            placeholder="Ex: Aplicar Dipirona 500mg EV se febre acima de 38°C antes da alta..."
            minRows={4}
            radius="md"
            value={orientacoes}
            onChange={(e) => setOrientacoes(e.currentTarget.value)}
          />
          <TextInput
            label="CRM (opcional)"
            placeholder="Ex: 123456-SP"
            value={crm}
            onChange={(e) => setCrm(e.currentTarget.value)}
            radius="md"
          />
          <Divider color="slate.1" />
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={onClose}>Cancelar</Button>
            <Button color="slate" leftSection={<IconDownload size={14} />} onClick={handleGerar}>
              Gerar Guia PDF
            </Button>
          </Group>
        </Stack>
      </Box>
    </Modal>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export const ExportPDF = () => {
  const { role, nome } = useAuth();
  const isMedico = role === 'medico';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<PatientWithVitals | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [atestadoOpen, setAtestadoOpen] = useState(false);
  const [prescricaoOpen, setPrescricaoOpen] = useState(false);

  const buscarPaciente = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError('');
    setSearched(false);
    setSelected(null);
    try {
      const res = await api.get('/patients');
      const all = res.data as Patient[];
      const found = all.filter((p) =>
        (p.nome_completo || '').toLowerCase().includes(query.toLowerCase()),
      );
      setResults(found);
      setSearched(true);
    } catch {
      setError('Erro ao buscar pacientes. Verifique se o servidor está ativo.');
    } finally {
      setSearching(false);
    }
  };

  const selecionarPaciente = async (patient: Patient) => {
    setLoadingDetail(true);
    setSelected(null);
    try {
      const res = await api.get(`/patients/${patient.id}`);
      setSelected(res.data as PatientWithVitals);
    } catch {
      setError('Erro ao carregar detalhes do paciente.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const latestVital = selected?.sinaisVitais?.[selected.sinaisVitais.length - 1];

  return (
    <PageShell
      title="Exportar Prontuário"
      description="Pesquise um paciente e exporte documentos médicos em PDF"
      icon={<IconFile size={28} />}
    >
      <AtestadoModal
        patient={selected}
        opened={atestadoOpen}
        onClose={() => setAtestadoOpen(false)}
        medicoNome={nome ?? 'Médico'}
      />
      <PrescricaoModal
        patient={selected}
        opened={prescricaoOpen}
        onClose={() => setPrescricaoOpen(false)}
        medicoNome={nome ?? 'Médico'}
      />

      <Grid gutter="md" style={{ flex: 1, minHeight: 0 }}>
        {/* ── Painel de busca ── */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Stack gap="sm" h="100%">
            <Paper withBorder radius="md" p="md">
              <Text fw={700} size="sm" c="slate.8" mb="sm">Buscar Paciente</Text>
              <Group gap="xs">
                <TextInput
                  placeholder="Nome do paciente..."
                  value={query}
                  onChange={(e) => setQuery(e.currentTarget.value)}
                  onKeyDown={(e) => e.key === 'Enter' && buscarPaciente()}
                  leftSection={<IconSearch size={14} />}
                  radius="md"
                  style={{ flex: 1 }}
                />
                <Button radius="md" color="slate" onClick={buscarPaciente} loading={searching} px="md">
                  Buscar
                </Button>
              </Group>
            </Paper>

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" radius="md" variant="light">
                {error}
              </Alert>
            )}

            {searched && (
              <Paper withBorder radius="md" p="sm" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <Text size="xs" fw={700} c="slate.5" tt="uppercase" mb="xs" pl={4}>
                  Resultados ({results.length})
                </Text>
                <ScrollArea style={{ flex: 1 }} type="auto">
                  {results.length === 0 ? (
                    <Text size="xs" c="dimmed" ta="center" py="xl">Nenhum paciente encontrado.</Text>
                  ) : (
                    <Stack gap="xs">
                      {results.map((p) => (
                        <Box
                          key={p.id}
                          px="sm"
                          py={10}
                          onClick={() => selecionarPaciente(p)}
                          style={{
                            cursor: 'pointer',
                            borderRadius: 10,
                            border: `1.5px solid ${selected?.id === p.id ? 'oklch(0.72 0.10 235)' : 'oklch(0.90 0.01 220)'}`,
                            background: selected?.id === p.id ? 'oklch(0.96 0.025 235)' : 'white',
                            transition: 'all 150ms ease',
                          }}
                        >
                          <Text fw={600} size="sm" c="slate.8">
                            {p.nome_completo || <Text span c="dimmed" fs="italic">Sem nome</Text>}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {[p.idade ? `${p.idade} anos` : null, p.sexo, p.cpf ? `CPF: ${p.cpf}` : null].filter(Boolean).join(' · ')}
                          </Text>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </ScrollArea>
              </Paper>
            )}
          </Stack>
        </Grid.Col>

        {/* ── Ficha médica ── */}
        <Grid.Col span={{ base: 12, lg: 8 }}>
          {loadingDetail ? (
            <Center h={400}>
              <Stack align="center" gap="xs">
                <Loader color="slate" size="md" type="dots" />
                <Text size="xs" c="slate.5">Carregando ficha médica...</Text>
              </Stack>
            </Center>
          ) : !selected ? (
            <Center h={400}>
              <Stack align="center" gap="sm">
                <ThemeIcon size={56} radius="xl" color="slate" variant="light">
                  <IconClipboardText size={28} />
                </ThemeIcon>
                <Text fw={600} c="slate.6">Selecione um paciente para visualizar a ficha</Text>
                <Text size="xs" c="dimmed" ta="center" maw={280}>
                  Use a busca ao lado para encontrar um paciente pelo nome e clique para visualizar o prontuário.
                </Text>
              </Stack>
            </Center>
          ) : (
            <ScrollArea h="calc(100dvh - 180px)" type="auto">
              <Paper withBorder radius="md" p="lg">
                {/* Header da ficha */}
                <Group justify="space-between" mb="md" wrap="wrap" gap="sm">
                  <Group gap="xs">
                    <ThemeIcon size="lg" radius="md" color="slate" variant="light">
                      <IconUser size={20} />
                    </ThemeIcon>
                    <Box>
                      <Text fw={800} size="lg" c="slate.9">
                        {selected.nome_completo || <Text span c="dimmed" fs="italic">Sem identificação</Text>}
                      </Text>
                      <Text size="xs" c="dimmed">Prontuário · ID: {selected.id.slice(0, 8).toUpperCase()}</Text>
                    </Box>
                  </Group>

                  {/* Botões de exportação */}
                  <Group gap="xs" wrap="wrap">
                    <Button
                      color="slate"
                      variant="filled"
                      leftSection={<IconDownload size={16} />}
                      radius="md"
                      size="sm"
                      onClick={() => gerarPDF(selected)}
                    >
                      Prontuário
                    </Button>
                    {isMedico && (
                      <>
                        <Button
                          color="slate"
                          variant="light"
                          leftSection={<IconFileCertificate size={16} />}
                          radius="md"
                          size="sm"
                          onClick={() => setAtestadoOpen(true)}
                        >
                          Atestado
                        </Button>
                        <Button
                          color="slate"
                          variant="outline"
                          leftSection={<IconPill size={16} />}
                          radius="md"
                          size="sm"
                          onClick={() => setPrescricaoOpen(true)}
                        >
                          Guia de Alta
                        </Button>
                      </>
                    )}
                  </Group>
                </Group>

                <Divider mb="md" color="slate.1" />

                {/* Dados pessoais */}
                <Box mb="lg">
                  <SectionTitle icon={<IconUser size={12} />} title="Dados Pessoais" />
                  <Stack gap={0}>
                    <InfoRow label="Nome Completo" value={selected.nome_completo} />
                    <InfoRow label="CPF" value={selected.cpf} />
                    <InfoRow label="RG" value={selected.rg} />
                    <InfoRow label="Idade" value={selected.idade ? `${selected.idade} anos` : undefined} />
                    <InfoRow label="Sexo" value={selected.sexo} />
                    <InfoRow label="Telefone" value={selected.telefone} />
                    <InfoRow label="Endereço" value={selected.endereco} />
                  </Stack>
                </Box>

                {/* Informações clínicas */}
                <Box mb="lg">
                  <SectionTitle icon={<IconStethoscope size={12} />} title="Informações Médicas" />
                  <Stack gap={0}>
                    <InfoRow label="Alergias" value={selected.alergias} />
                    <InfoRow label="Medicamentos em Uso" value={selected.medicamentos_em_uso} />
                  </Stack>
                </Box>

                {/* Anamnese */}
                {selected.anamnese && (
                  <Box mb="lg">
                    <SectionTitle icon={<IconClipboardText size={12} />} title="Anamnese" />
                    <Paper radius="md" p="sm" style={{ background: 'var(--mantine-color-slate-0)', border: '1px solid var(--mantine-color-slate-1)' }}>
                      <Text size="sm" c="slate.7" style={{ whiteSpace: 'pre-wrap' }}>{selected.anamnese}</Text>
                    </Paper>
                  </Box>
                )}

                {/* Sinais vitais */}
                {latestVital && (
                  <Box>
                    <SectionTitle icon={<IconHeartbeat size={12} />} title="Último Registro de Sinais Vitais" />
                    <Grid gutter="sm">
                      {[
                        { label: 'Temperatura', value: latestVital.temperatura ? `${latestVital.temperatura} °C` : undefined, color: 'orange' },
                        { label: 'Pressão Arterial', value: latestVital.pressao_arterial, color: 'red' },
                        { label: 'Freq. Cardíaca', value: latestVital.frequencia_cardiaca ? `${latestVital.frequencia_cardiaca} bpm` : undefined, color: 'pink' },
                        { label: 'SpO₂', value: latestVital.saturacao_oxigenio ? `${latestVital.saturacao_oxigenio}%` : undefined, color: 'blue' },
                      ].map(({ label, value, color }) => (
                        <Grid.Col key={label} span={6}>
                          <Paper withBorder p="sm" radius="md" style={{ textAlign: 'center' }}>
                            <Badge color={color} size="xs" variant="light" mb={4}>{label}</Badge>
                            <Text fw={800} size="lg" c="slate.8">{value ?? '—'}</Text>
                          </Paper>
                        </Grid.Col>
                      ))}
                    </Grid>
                    {latestVital.created_at && (
                      <Text size="xs" c="dimmed" mt="xs" pl={4}>
                        Registrado em: {new Date(latestVital.created_at).toLocaleString('pt-BR')}
                      </Text>
                    )}
                  </Box>
                )}
              </Paper>
            </ScrollArea>
          )}
        </Grid.Col>
      </Grid>
    </PageShell>
  );
};
