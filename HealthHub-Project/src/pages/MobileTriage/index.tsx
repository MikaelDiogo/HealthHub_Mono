import { useState, useEffect } from 'react';
import {
  Box, Stack, Text, Group, Badge, Button, ActionIcon,
  Paper, TextInput, Textarea, Loader, Center, Modal,
  ThemeIcon, Alert, ScrollArea, Divider, UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconUsers, IconUserPlus, IconLogout2, IconRefresh,
  IconSearch, IconX, IconAlertCircle, IconClipboardList,
  IconUser, IconStethoscope, IconClipboardText,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useCare, type Gravidade, type FilaPaciente } from '../../context/CareContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import type { Patient } from '../../types/patient';
import { useForm as useMantineForm } from '@mantine/form';
import { formatCPF, formatPhone, onlyDigits, stripMask } from '../../utils/formatters';

// ── Senha counter local ────────────────────────────────────────────────────────
let mobileCounter = 1;
function gerarSenha(): string {
  return `PR-${String(mobileCounter++).padStart(3, '0')}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function gravColor(g?: Gravidade): string {
  if (g === 'Vermelho') return '#ef4444';
  if (g === 'Amarelo') return '#eab308';
  if (g === 'Verde') return '#22c55e';
  return 'var(--mantine-color-slate-3)';
}

function gravBadgeColor(g?: Gravidade) {
  if (g === 'Vermelho') return 'red';
  if (g === 'Amarelo') return 'yellow';
  if (g === 'Verde') return 'green';
  return 'gray';
}

function statusBorderColor(p: FilaPaciente): string {
  if (p.gravidade) return gravColor(p.gravidade);
  if (p.status === 'Em Triagem (Enfermeiro)') return 'var(--mantine-color-blue-5)';
  return 'var(--mantine-color-slate-2)';
}

type ActiveView = 'fila' | 'cadastrar';

// ── Modal: Admitir paciente existente ─────────────────────────────────────────
function AdmitirModal({
  opened, onClose, onAdmit, filaIds,
}: {
  opened: boolean;
  onClose: () => void;
  onAdmit: (p: Patient) => Promise<void>;
  filaIds: string[];
}) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [admitting, setAdmitting] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    setLoading(true);
    api.get<Patient[]>('/patients')
      .then((r) => setPatients(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [opened]);

  const filtered = patients.filter(
    (p) => !filaIds.includes(p.id) &&
      (p.nome_completo ?? '').toLowerCase().includes(query.toLowerCase()),
  );

  const handleAdmit = async (p: Patient) => {
    setAdmitting(p.id);
    try {
      await onAdmit(p);
      onClose();
    } finally {
      setAdmitting(null);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={700} size="sm">Admitir na Fila</Text>}
      centered
      radius="md"
      size="sm"
      fullScreen
    >
      <TextInput
        placeholder="Buscar por nome..."
        leftSection={<IconSearch size={14} />}
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        mb="sm"
        radius="md"
        size="md"
      />
      {loading ? (
        <Center py="xl"><Loader size="sm" color="slate" type="dots" /></Center>
      ) : filtered.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="xl">
          {patients.length === 0
            ? 'Nenhum paciente cadastrado.'
            : 'Todos já estão na fila ou não foram encontrados.'}
        </Text>
      ) : (
        <Stack gap="xs">
          {filtered.map((p) => (
            <Paper
              key={p.id}
              withBorder
              p="sm"
              radius="md"
              style={{ borderLeft: '4px solid var(--mantine-color-slate-3)' }}
            >
              <Group justify="space-between">
                <Box>
                  <Text fw={600} size="sm" c="slate.8">
                    {p.nome_completo || <Text span c="dimmed" fs="italic">Sem nome</Text>}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {[p.idade ? `${p.idade} anos` : null, p.sexo].filter(Boolean).join(' · ')}
                  </Text>
                </Box>
                <Button
                  size="sm"
                  color="slate"
                  loading={admitting === p.id}
                  leftSection={<IconUserPlus size={14} />}
                  onClick={() => handleAdmit(p)}
                >
                  Admitir
                </Button>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </Modal>
  );
}

// ── Card de paciente na fila ──────────────────────────────────────────────────
function FilaCard({
  patient,
  isEnfermeiro,
  onAvancar,
  onRemover,
}: {
  patient: FilaPaciente;
  isEnfermeiro: boolean;
  onAvancar: (id: string, status: FilaPaciente['status'], g?: Gravidade) => Promise<void>;
  onRemover: (id: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const act = async (fn: () => Promise<void>) => {
    setLoading(true);
    try { await fn(); } finally { setLoading(false); }
  };

  const showIniciarTriagem =
    isEnfermeiro && patient.status === 'Aguardando Triagem';
  const showClassificar =
    isEnfermeiro && patient.status === 'Em Triagem (Enfermeiro)';

  return (
    <Paper
      withBorder
      radius="md"
      style={{ borderLeft: `4px solid ${statusBorderColor(patient)}`, overflow: 'hidden' }}
    >
      <Box p="sm">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs" mb={2}>
              <Text
                ff="monospace"
                fw={800}
                size="sm"
                c="slate.9"
                style={{ whiteSpace: 'nowrap' }}
              >
                {patient.senha}
              </Text>
              {patient.gravidade && (
                <Badge size="xs" color={gravBadgeColor(patient.gravidade)}>
                  {patient.gravidade}
                </Badge>
              )}
            </Group>
            <Text fw={600} size="sm" c="slate.8" truncate>
              {patient.nome || <Text span c="dimmed" fs="italic">Sem nome</Text>}
            </Text>
            <Text size="xs" c="dimmed">
              {patient.idade ? `${patient.idade} anos` : '—'} · Chegada: {patient.chegada}
            </Text>
          </Box>
          <ActionIcon
            size="sm"
            color="gray"
            variant="subtle"
            onClick={() => act(() => onRemover(patient.id))}
            loading={loading}
          >
            <IconX size={12} />
          </ActionIcon>
        </Group>

        {/* Badge de status */}
        <Badge size="xs" variant="light" color="slate" mt="xs">
          {patient.status}
        </Badge>
      </Box>

      {/* Ações do enfermeiro */}
      {(showIniciarTriagem || showClassificar) && (
        <>
          <Divider color="slate.1" />
          <Box p="sm" bg="slate.0">
            {showIniciarTriagem && (
              <Button
                fullWidth
                size="md"
                color="blue"
                variant="light"
                loading={loading}
                leftSection={<IconRefresh size={16} />}
                onClick={() => act(() => onAvancar(patient.id, 'Em Triagem (Enfermeiro)'))}
              >
                Iniciar Triagem
              </Button>
            )}

            {showClassificar && (
              <Stack gap="xs">
                <Text size="xs" fw={700} c="slate.6" tt="uppercase">
                  Classificar risco:
                </Text>
                <Group grow gap="xs">
                  {(['Verde', 'Amarelo', 'Vermelho'] as Gravidade[]).map((g) => (
                    <Button
                      key={g}
                      size="md"
                      color={gravBadgeColor(g)}
                      loading={loading}
                      onClick={() =>
                        act(() => onAvancar(patient.id, 'Aguardando Atendimento', g))
                      }
                    >
                      {g}
                    </Button>
                  ))}
                </Group>
              </Stack>
            )}
          </Box>
        </>
      )}
    </Paper>
  );
}

// ── View: Fila de espera ──────────────────────────────────────────────────────
function FilaView({
  onAdmitir,
}: {
  onAdmitir: () => void;
}) {
  const { carePatients, loading, avançarFluxo, removerPaciente, recarregar } = useCare();
  const { role } = useAuth();
  const isEnfermeiro = role === 'enfermeiro';
  const [refreshing, setRefreshing] = useState(false);

  const sorted = [...carePatients].sort((a, b) => {
    const order = { Vermelho: 0, Amarelo: 1, Verde: 2 };
    const aO = a.gravidade ? order[a.gravidade] : 3;
    const bO = b.gravidade ? order[b.gravidade] : 3;
    return aO - bO;
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await recarregar();
    setRefreshing(false);
  };

  // Contadores de status
  const aguardando = carePatients.filter(
    (p) => p.status === 'Aguardando Triagem' || p.status === 'Em Triagem (Enfermeiro)',
  ).length;
  const emAtendimento = carePatients.filter(
    (p) => p.status === 'Aguardando Atendimento' || p.status === 'Em Consulta (Médico)',
  ).length;
  const emObservacao = carePatients.filter((p) => p.status === 'Em Observação').length;

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header da view */}
      <Box px="md" pt="md" pb="xs">
        <Group justify="space-between" mb="xs">
          <Text fw={700} size="md" c="slate.8">Fila de Atendimento</Text>
          <ActionIcon
            variant="light"
            color="slate"
            size="md"
            loading={refreshing}
            onClick={handleRefresh}
          >
            <IconRefresh size={16} />
          </ActionIcon>
        </Group>

        {/* Contadores rápidos */}
        <Group gap="xs" mb="xs">
          <Badge size="sm" color="blue" variant="light">
            {aguardando} triagem
          </Badge>
          <Badge size="sm" color="teal" variant="light">
            {emAtendimento} médico
          </Badge>
          <Badge size="sm" color="indigo" variant="light">
            {emObservacao} obs.
          </Badge>
        </Group>
      </Box>

      {/* Lista scrollável */}
      <ScrollArea style={{ flex: 1 }} px="md">
        {loading ? (
          <Center py="xl"><Loader color="slate" type="dots" /></Center>
        ) : sorted.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <ThemeIcon size="xl" variant="light" color="slate" radius="xl">
                <IconClipboardList size={24} />
              </ThemeIcon>
              <Text size="sm" c="dimmed" ta="center">
                Nenhum paciente na fila
              </Text>
            </Stack>
          </Center>
        ) : (
          <Stack gap="sm" pb="md">
            {sorted.map((p) => (
              <FilaCard
                key={p.id}
                patient={p}
                isEnfermeiro={isEnfermeiro}
                onAvancar={avançarFluxo}
                onRemover={removerPaciente}
              />
            ))}
          </Stack>
        )}
      </ScrollArea>

      {/* FAB: Admitir paciente */}
      <Box px="md" py="sm" style={{ borderTop: '1px solid var(--mantine-color-slate-2)', background: 'white' }}>
        <Button
          fullWidth
          size="md"
          color="slate"
          leftSection={<IconUserPlus size={18} />}
          onClick={onAdmitir}
        >
          Admitir Paciente na Fila
        </Button>
      </Box>
    </Box>
  );
}

// ── View: Cadastrar paciente ──────────────────────────────────────────────────
function CadastrarView() {
  const { role } = useAuth();
  const { admitirPaciente, carePatients } = useCare();
  const isRecepcionista = role === 'recepcionista';
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'pessoais' | 'hospitalares' | 'anamnese'>('pessoais');

  const form = useMantineForm({
    initialValues: {
      nome_completo: '',
      rg: '',
      cpf: '',
      idade: '',
      sexo: '',
      telefone: '',
      endereco: '',
      alergias: '',
      medicamentos_em_uso: '',
      anamnese: '',
      temperatura: '',
      saturacao_oxigenio: '',
      pressao_arterial: '',
      frequencia_cardiaca: '',
    },
  });

  const handleSubmit = async (values: typeof form.values, admitir: boolean) => {
    setLoading(true);
    try {
      const res = await api.post('/patients', {
        nome_completo: values.nome_completo || undefined,
        rg: values.rg || undefined,
        cpf: values.cpf ? stripMask(values.cpf) : undefined,
        idade: values.idade ? Number(values.idade) : undefined,
        sexo: values.sexo || undefined,
        telefone: values.telefone ? stripMask(values.telefone) : undefined,
        endereco: values.endereco || undefined,
        ...(!isRecepcionista && {
          alergias: values.alergias || undefined,
          medicamentos_em_uso: values.medicamentos_em_uso || undefined,
          anamnese: values.anamnese || undefined,
        }),
      });

      const patientId = res.data.id;

      if (!isRecepcionista && (values.temperatura || values.frequencia_cardiaca)) {
        await api.post(`/sinais/${patientId}`, {
          temperatura: values.temperatura || undefined,
          frequencia_cardiaca: values.frequencia_cardiaca || undefined,
          saturacao_oxigenio: values.saturacao_oxigenio || undefined,
          pressao_arterial: values.pressao_arterial || undefined,
        });
      }

      if (admitir) {
        const jaEmFila = carePatients.some((p) => p.paciente_id === patientId);
        if (!jaEmFila) {
          await admitirPaciente(res.data, gerarSenha());
        }
      }

      form.reset();
      setSuccess(true);
      setActiveTab('pessoais');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar:', err);
    } finally {
      setLoading(false);
    }
  };

  const TABS = [
    { value: 'pessoais', label: 'Pessoais', icon: <IconUser size={14} /> },
    ...(!isRecepcionista ? [
      { value: 'hospitalares', label: 'Triagem', icon: <IconStethoscope size={14} /> },
      { value: 'anamnese', label: 'Anamnese', icon: <IconClipboardText size={14} /> },
    ] : []),
  ] as const;

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <Box px="md" pt="md" pb="xs">
        <Text fw={700} size="md" c="slate.8" mb="xs">Cadastrar Paciente</Text>

        {success && (
          <Alert color="teal" radius="md" mb="xs" variant="light">
            Paciente registrado com sucesso!
          </Alert>
        )}

        {isRecepcionista && (
          <Alert icon={<IconAlertCircle size={14} />} color="blue" variant="light" radius="md" mb="xs">
            Todos os campos são opcionais. Em emergência, pode salvar em branco.
          </Alert>
        )}

        {/* Tabs */}
        {!isRecepcionista && (
          <Group gap={4}>
            {TABS.map((t) => (
              <UnstyledButton
                key={t.value}
                onClick={() => setActiveTab(t.value as typeof activeTab)}
                px="sm"
                py={6}
                style={{
                  borderRadius: 8,
                  backgroundColor:
                    activeTab === t.value
                      ? 'var(--mantine-color-slate-9)'
                      : 'var(--mantine-color-slate-1)',
                  color: activeTab === t.value ? 'white' : 'var(--mantine-color-slate-7)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {t.icon}
                {t.label}
              </UnstyledButton>
            ))}
          </Group>
        )}
      </Box>

      {/* Form scrollável */}
      <ScrollArea style={{ flex: 1 }} px="md">
        <Stack gap="sm" pb="md">
          {/* Aba Pessoais (sempre visível para recepcionista) */}
          {(activeTab === 'pessoais' || isRecepcionista) && (
            <>
              <TextInput
                label="Nome Completo"
                placeholder="Ex: Maria Silva Santos"
                radius="md"
                size="md"
                maxLength={100}
                {...form.getInputProps('nome_completo')}
              />
              <Group grow>
                <TextInput
                  label="RG"
                  radius="md"
                  size="md"
                  maxLength={12}
                  {...form.getInputProps('rg')}
                />
                <TextInput
                  label="CPF"
                  radius="md"
                  size="md"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  {...form.getInputProps('cpf')}
                  onChange={(e) => form.setFieldValue('cpf', formatCPF(e.currentTarget.value))}
                />
              </Group>
              <Group grow>
                <TextInput
                  label="Idade"
                  radius="md"
                  size="md"
                  maxLength={3}
                  {...form.getInputProps('idade')}
                  onChange={(e) => form.setFieldValue('idade', onlyDigits(e.currentTarget.value, 3))}
                />
                <TextInput
                  label="Sexo"
                  radius="md"
                  size="md"
                  maxLength={20}
                  {...form.getInputProps('sexo')}
                />
              </Group>
              <TextInput
                label="Telefone"
                radius="md"
                size="md"
                placeholder="(00) 00000-0000"
                maxLength={15}
                {...form.getInputProps('telefone')}
                onChange={(e) => form.setFieldValue('telefone', formatPhone(e.currentTarget.value))}
              />
              <TextInput
                label="Endereço"
                radius="md"
                size="md"
                maxLength={200}
                {...form.getInputProps('endereco')}
              />
            </>
          )}

          {/* Aba Hospitalares / Triagem */}
          {activeTab === 'hospitalares' && !isRecepcionista && (
            <>
              <Box
                p="sm"
                style={{
                  backgroundColor: 'var(--mantine-color-slate-0)',
                  borderRadius: 10,
                  border: '1px solid var(--mantine-color-slate-1)',
                }}
              >
                <Text size="xs" fw={700} c="slate.5" tt="uppercase" mb="sm">
                  Sinais Vitais de Triagem
                </Text>
                <Group grow mb="sm">
                  <TextInput
                    label="Temperatura (°C)"
                    radius="md"
                    size="md"
                    placeholder="37.5"
                    maxLength={5}
                    {...form.getInputProps('temperatura')}
                  />
                  <TextInput
                    label="SpO₂ (%)"
                    radius="md"
                    size="md"
                    placeholder="98"
                    maxLength={3}
                    {...form.getInputProps('saturacao_oxigenio')}
                    onChange={(e) =>
                      form.setFieldValue('saturacao_oxigenio', onlyDigits(e.currentTarget.value, 3))
                    }
                  />
                </Group>
                <Group grow>
                  <TextInput
                    label="Pressão Arterial"
                    radius="md"
                    size="md"
                    placeholder="120/80"
                    maxLength={7}
                    {...form.getInputProps('pressao_arterial')}
                  />
                  <TextInput
                    label="FC (bpm)"
                    radius="md"
                    size="md"
                    placeholder="72"
                    maxLength={3}
                    {...form.getInputProps('frequencia_cardiaca')}
                    onChange={(e) =>
                      form.setFieldValue('frequencia_cardiaca', onlyDigits(e.currentTarget.value, 3))
                    }
                  />
                </Group>
              </Box>
              <TextInput
                label="Alergias"
                radius="md"
                size="md"
                {...form.getInputProps('alergias')}
              />
              <TextInput
                label="Medicamentos em uso"
                radius="md"
                size="md"
                {...form.getInputProps('medicamentos_em_uso')}
              />
            </>
          )}

          {/* Aba Anamnese */}
          {activeTab === 'anamnese' && !isRecepcionista && (
            <Textarea
              label="Anamnese"
              minRows={8}
              radius="md"
              size="md"
              {...form.getInputProps('anamnese')}
            />
          )}
        </Stack>
      </ScrollArea>

      {/* Botões de ação fixos embaixo */}
      <Box
        px="md"
        py="sm"
        style={{ borderTop: '1px solid var(--mantine-color-slate-2)', background: 'white' }}
      >
        <Stack gap="xs">
          <Button
            fullWidth
            size="md"
            color="slate"
            loading={loading}
            onClick={() => handleSubmit(form.values, false)}
          >
            Salvar Cadastro
          </Button>
          <Button
            fullWidth
            size="md"
            color="teal"
            variant="light"
            loading={loading}
            leftSection={<IconUserPlus size={16} />}
            onClick={() => handleSubmit(form.values, true)}
          >
            Salvar e Admitir na Fila
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function MobileTriage() {
  const { carePatients, admitirPaciente } = useCare();
  const { clearAuth } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ActiveView>('fila');
  const [admitirOpened, { open: openAdmitir, close: closeAdmitir }] = useDisclosure(false);

  const filaIds = carePatients.map((p) => p.paciente_id);

  const handleAdmitir = async (patient: Patient) => {
    await admitirPaciente(patient, gerarSenha());
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/', { replace: true });
  };

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Conteúdo da view ativa */}
      <Box style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeView === 'fila' ? (
          <FilaView onAdmitir={openAdmitir} />
        ) : (
          <CadastrarView />
        )}
      </Box>

      {/* Bottom navigation */}
      <Box
        style={{
          display: 'flex',
          borderTop: '1px solid var(--mantine-color-slate-2)',
          backgroundColor: 'white',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {(
          [
            { key: 'fila', label: 'Fila', icon: <IconUsers size={22} /> },
            { key: 'cadastrar', label: 'Cadastrar', icon: <IconUserPlus size={22} /> },
          ] as const
        ).map((tab) => (
          <UnstyledButton
            key={tab.key}
            style={{ flex: 1 }}
            onClick={() => setActiveView(tab.key)}
          >
            <Box
              py="sm"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                color:
                  activeView === tab.key
                    ? 'var(--mantine-color-slate-9)'
                    : 'var(--mantine-color-slate-4)',
                borderTop:
                  activeView === tab.key
                    ? '2px solid var(--mantine-color-slate-9)'
                    : '2px solid transparent',
              }}
            >
              {tab.icon}
              <Text size="10px" fw={600}>
                {tab.label}
              </Text>
            </Box>
          </UnstyledButton>
        ))}

        {/* Sair */}
        <UnstyledButton style={{ flex: 1 }} onClick={handleLogout}>
          <Box
            py="sm"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              color: 'var(--mantine-color-slate-4)',
            }}
          >
            <IconLogout2 size={22} />
            <Text size="10px" fw={600}>
              Sair
            </Text>
          </Box>
        </UnstyledButton>
      </Box>

      <AdmitirModal
        opened={admitirOpened}
        onClose={closeAdmitir}
        onAdmit={handleAdmitir}
        filaIds={filaIds}
      />
    </Box>
  );
}
