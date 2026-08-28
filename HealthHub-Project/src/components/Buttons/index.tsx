import {
  Button,
  Text,
  UnstyledButton,
  Group,
  Box,
  Title,
  Modal,
  Tabs,
  TextInput,
  Textarea,
  Stack,
  ThemeIcon,
  Alert,
  Badge,
} from '@mantine/core';
import { NavLink as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { IconHeartRateMonitor, IconLogout2, IconPlus, IconAlertCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm } from '@mantine/form';
import api from '../../services/api';
import { useDisclosure } from '@mantine/hooks';
import { IconUser, IconStethoscope, IconClipboardText } from '@tabler/icons-react';
import type { Patient } from '../../types/patient';
import { useAuth } from '../../context/AuthContext';
import { formatCPF, formatPhone, onlyDigits, stripMask } from '../../utils/formatters';
import { dispatchVitalsUpdated } from '../../utils/vitalStatus';

interface SidebarLinkProps {
  to: string;
  label: string;
  textLabel: string;
  icon: React.ReactNode;
  badge?: string;
  onClick?: () => void;
}

export const ButtonLogOut = ({ to, icon }: SidebarLinkProps) => {
  const navigate = useNavigate();
  const { clearAuth } = useAuth();

  const handleLogout = () => {
    clearAuth();
    navigate(to, { replace: true });
  };

  return (
    <UnstyledButton onClick={handleLogout} style={{ display: 'flex', alignItems: 'center' }}>
      {icon ?? (
        <Group gap={6} px="xs" py={6} style={{ border: '1px solid var(--mantine-color-slate-3)', borderRadius: 8 }}>
          <Text size="sm" fw={500}>
            Sair
          </Text>
          <IconLogout2 size={18} />
        </Group>
      )}
    </UnstyledButton>
  );
};

export const SideBarLink = ({ to, label, icon, textLabel, badge, onClick }: SidebarLinkProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <UnstyledButton
      component={RouterLink}
      to={to}
      w="100%"
      px="sm"
      py={5}
      onClick={onClick}
      style={{
        borderRadius: 8,
        border: isActive
          ? '1.5px solid oklch(0.82 0.07 235)'
          : '1.5px solid transparent',
        backgroundColor: isActive ? 'oklch(0.96 0.025 235)' : 'transparent',
        transition: 'background-color 150ms ease, border-color 150ms ease',
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = 'var(--mantine-color-slate-0)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <Group gap={8} justify="space-between" w="100%">
        <Group gap={8}>
          <div style={{ color: isActive ? 'oklch(0.52 0.14 235)' : 'var(--mantine-color-slate-5)', display: 'flex' }}>
            {icon}
          </div>
          <Stack gap={0} align="flex-start">
            <Text size="sm" fw={600} style={{ color: isActive ? 'oklch(0.28 0.10 235)' : 'var(--mantine-color-slate-7)' }}>
              {label}
            </Text>
            <Text size="xs" c="slate.5">
              {textLabel}
            </Text>
          </Stack>
        </Group>
        {badge && (
          <Badge size="xs" color="slate" variant="filled" style={{ flexShrink: 0 }}>
            {badge}
          </Badge>
        )}
      </Group>
    </UnstyledButton>
  );
};

interface ButtonAddPatientProps {
  onPatientCreated?: () => void;
}

export const ButtonAddPatient = ({ onPatientCreated }: ButtonAddPatientProps) => {
  const [opened, { open, close }] = useDisclosure(false);
  const [loading, setLoading] = useState(false);
  const { role } = useAuth();
  const isRecepcionista = role === 'recepcionista';

  const form = useForm({
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

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const response = await api.post('/patients', {
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

      const patientId = response.data.id;
      if (!isRecepcionista && (values.temperatura || values.frequencia_cardiaca)) {
        await api.post(`/sinais/${patientId}`, {
          temperatura: values.temperatura,
          frequencia_cardiaca: values.frequencia_cardiaca,
          saturacao_oxigenio: values.saturacao_oxigenio,
          pressao_arterial: values.pressao_arterial,
        });
        dispatchVitalsUpdated(patientId);
      }

      form.reset();
      close();
      onPatientCreated?.();
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button color="slate" size="md" radius="md" leftSection={<IconPlus size={18} />} onClick={open}>
        Adicionar Paciente
      </Button>

      <Modal opened={opened} onClose={close} withCloseButton={false} centered size="lg" radius="lg" padding={0}>
        <Box p="lg" style={{ background: 'oklch(0.24 0.02 240)' }}>
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" variant="light" color="gray">
              <IconHeartRateMonitor size={20} />
            </ThemeIcon>
            <Box>
              <Title order={3} c="white" size="lg" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Novo Paciente
              </Title>
              <Text size="xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'oklch(0.65 0.03 230)' }}>
                {isRecepcionista
                  ? 'Todos os campos são opcionais — emergências podem ser admitidas em branco.'
                  : 'Dados cadastrais, triagem e anamnese do paciente.'}
              </Text>
            </Box>
          </Group>
        </Box>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Box p="lg" bg="white">
            {isRecepcionista ? (
              <>
                <Alert
                  icon={<IconAlertCircle size={14} />}
                  color="blue"
                  variant="light"
                  radius="md"
                  mb="md"
                  title="Todos os campos são opcionais"
                >
                  Em situações de emergência, o paciente pode ser admitido sem dados preenchidos.
                </Alert>
                <Stack gap="md">
                  <TextInput label="Nome Completo" placeholder="Ex: Maria Silva Santos" radius="md" maxLength={100} {...form.getInputProps('nome_completo')} />
                  <Group grow>
                    <TextInput label="RG" radius="md" maxLength={12} {...form.getInputProps('rg')} />
                    <TextInput
                      label="CPF"
                      radius="md"
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
                      maxLength={3}
                      {...form.getInputProps('idade')}
                      onChange={(e) => form.setFieldValue('idade', onlyDigits(e.currentTarget.value, 3))}
                    />
                    <TextInput label="Sexo" radius="md" maxLength={20} {...form.getInputProps('sexo')} />
                  </Group>
                  <TextInput
                    label="Telefone"
                    radius="md"
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    {...form.getInputProps('telefone')}
                    onChange={(e) => form.setFieldValue('telefone', formatPhone(e.currentTarget.value))}
                  />
                  <TextInput label="Endereço" radius="md" maxLength={200} {...form.getInputProps('endereco')} />
                </Stack>
              </>
            ) : (
              <Tabs color="slate" defaultValue="pessoais" variant="pills">
                <Tabs.List grow mb="xl" style={{ backgroundColor: 'var(--mantine-color-slate-0)', padding: 4, borderRadius: 12 }}>
                  <Tabs.Tab value="pessoais" leftSection={<IconUser size={16} />}>
                    Pessoais
                  </Tabs.Tab>
                  <Tabs.Tab value="hospitalares" leftSection={<IconStethoscope size={16} />}>
                    Hospitalares / Triagem
                  </Tabs.Tab>
                  <Tabs.Tab value="anamnese" leftSection={<IconClipboardText size={16} />}>
                    Anamnese
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="pessoais">
                  <Stack gap="md">
                    <TextInput label="Nome Completo" placeholder="Ex: Maria Silva Santos" radius="md" maxLength={100} {...form.getInputProps('nome_completo')} />
                    <Group grow>
                      <TextInput label="RG" radius="md" maxLength={12} {...form.getInputProps('rg')} />
                      <TextInput
                        label="CPF"
                        radius="md"
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
                        maxLength={3}
                        {...form.getInputProps('idade')}
                        onChange={(e) => form.setFieldValue('idade', onlyDigits(e.currentTarget.value, 3))}
                      />
                      <TextInput label="Sexo" radius="md" maxLength={20} {...form.getInputProps('sexo')} />
                    </Group>
                    <TextInput
                      label="Telefone"
                      radius="md"
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      {...form.getInputProps('telefone')}
                      onChange={(e) => form.setFieldValue('telefone', formatPhone(e.currentTarget.value))}
                    />
                    <TextInput label="Endereço" radius="md" maxLength={200} {...form.getInputProps('endereco')} />
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="hospitalares">
                  <Stack gap="md">
                    <Box p="md" style={{ backgroundColor: 'var(--mantine-color-slate-0)', borderRadius: 12, border: '1px solid var(--mantine-color-slate-1)' }}>
                      <Text size="xs" fw={700} c="slate.5" tt="uppercase" mb="sm">
                        Sinais Vitais de Triagem
                      </Text>
                      <Group grow mb="md">
                        <TextInput
                          label="Temperatura (°C)"
                          radius="md"
                          placeholder="37.5"
                          maxLength={5}
                          {...form.getInputProps('temperatura')}
                        />
                        <TextInput
                          label="SpO₂ (%)"
                          radius="md"
                          placeholder="98"
                          maxLength={3}
                          {...form.getInputProps('saturacao_oxigenio')}
                          onChange={(e) => form.setFieldValue('saturacao_oxigenio', onlyDigits(e.currentTarget.value, 3))}
                        />
                      </Group>
                      <Group grow>
                        <TextInput
                          label="Pressão Arterial"
                          radius="md"
                          placeholder="120/80"
                          maxLength={7}
                          {...form.getInputProps('pressao_arterial')}
                        />
                        <TextInput
                          label="FC (bpm)"
                          radius="md"
                          placeholder="72"
                          maxLength={3}
                          {...form.getInputProps('frequencia_cardiaca')}
                          onChange={(e) => form.setFieldValue('frequencia_cardiaca', onlyDigits(e.currentTarget.value, 3))}
                        />
                      </Group>
                    </Box>
                    <TextInput label="Alergias" radius="md" {...form.getInputProps('alergias')} />
                    <TextInput label="Medicamentos em uso" radius="md" {...form.getInputProps('medicamentos_em_uso')} />
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="anamnese">
                  <Textarea label="Anamnese" minRows={8} radius="md" {...form.getInputProps('anamnese')} />
                </Tabs.Panel>
              </Tabs>
            )}

            <Group justify="flex-end" mt="xl" pt="md" style={{ borderTop: '1px solid var(--mantine-color-slate-1)' }}>
              <Button variant="subtle" color="gray" onClick={close}>
                Cancelar
              </Button>
              <Button type="submit" color="slate" loading={loading}>
                Salvar e Registrar
              </Button>
            </Group>
          </Box>
        </form>
      </Modal>
    </>
  );
};

interface ButtonEnterProps {
  onClick?: () => void;
  type?: 'button' | 'submit';
}

export const ButtonEnter = ({ onClick, type = 'button' }: ButtonEnterProps) => (
  <Button
    type={type}
    onClick={onClick}
    w={320}
    h={44}
    mt="md"
    radius="md"
    color="slate.9"
    styles={{
      root: {
        backgroundColor: 'var(--mantine-color-slate-9)',
        fontFamily: "'Inter', sans-serif",
        fontWeight: 600,
        letterSpacing: '0.02em',
        '&:hover': { backgroundColor: 'var(--mantine-color-slate-8)' },
      },
    }}
  >
    Entrar
  </Button>
);

export type { Patient };
