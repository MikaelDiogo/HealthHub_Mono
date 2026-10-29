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
  Alert,
  Badge,
} from '@mantine/core';
import { NavLink as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { IconLogout2, IconPlus, IconAlertCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm } from '@mantine/form';
import api from '../../services/api';
import { useDisclosure } from '@mantine/hooks';
import { IconUser, IconStethoscope, IconClipboardText } from '@tabler/icons-react';
import type { Patient } from '../../types/patient';
import { useAuth } from '../../context/AuthContext';
import { formatCPF, formatPhone, onlyDigits, stripMask } from '../../utils/formatters';
import { dispatchVitalsUpdated } from '../../utils/vitalStatus';
import { mensagemErro } from '../../utils/erro';
import { AvisoErro } from '../ui';

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
    <UnstyledButton onClick={handleLogout} aria-label="Sair" title="Sair" style={{ display: 'flex', alignItems: 'center' }}>
      {icon ?? (
        <Group gap={6} px="xs" py={6} style={{ border: '1px solid var(--hh-control)', borderRadius: 'var(--hh-radius-control)' }}>
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
      title={textLabel || undefined}
      w="100%"
      px="sm"
      onClick={onClick}
      style={{
        minHeight: 36,
        display: 'flex',
        alignItems: 'center',
        borderRadius: 'var(--hh-radius-control)',
        backgroundColor: isActive ? 'var(--hh-active)' : 'transparent',
        transition: 'background-color 120ms ease',
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = 'var(--hh-raised)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <Group gap={10} justify="space-between" w="100%" wrap="nowrap">
        <Group gap={10} wrap="nowrap">
          <div style={{ color: isActive ? 'var(--hh-ink)' : 'var(--hh-faint)', display: 'flex' }}>
            {icon}
          </div>
          <Text size="sm" fw={isActive ? 600 : 500} c="var(--hh-ink)">
            {label}
          </Text>
        </Group>
        {badge && (
          <Badge size="xs" color="slate" variant="light" style={{ flexShrink: 0 }}>
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
  const [erro, setErro] = useState<string | null>(null);
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
    setErro(null);
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
          temperatura: values.temperatura || undefined,
          frequencia_cardiaca: values.frequencia_cardiaca || undefined,
          saturacao_oxigenio: values.saturacao_oxigenio || undefined,
          pressao_arterial: values.pressao_arterial || undefined,
        });
        dispatchVitalsUpdated(patientId);
      }

      form.reset();
      close();
      onPatientCreated?.();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setErro(mensagemErro(error, 'Não foi possível salvar o paciente.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button color="slate" size="sm" radius="md" leftSection={<IconPlus size={15} />} onClick={() => { setErro(null); open(); }}>
        Adicionar Paciente
      </Button>

      <Modal opened={opened} onClose={close} withCloseButton={false} centered size="lg" padding={0}>
        <Box p="lg" style={{ borderBottom: '1px solid var(--hh-border)' }}>
          <Title order={4} c="var(--hh-ink)">
            Novo paciente
          </Title>
          <Text size="sm" c="var(--hh-muted)" mt={2}>
            {isRecepcionista
              ? 'Cadastro mínimo: nome, CPF, idade e sexo são obrigatórios.'
              : 'Dados cadastrais, triagem e anamnese do paciente.'}
          </Text>
        </Box>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Box p="lg" bg="white">
            <AvisoErro mensagem={erro} onFechar={() => setErro(null)} />
            {isRecepcionista ? (
              <>
                <Alert
                  icon={<IconAlertCircle size={14} />}
                  color="blue"
                  variant="light"
                  radius="md"
                  mb="md"
                  title="Dados obrigatórios"
                >
                  Informe nome completo, CPF (11 dígitos), idade e sexo (M, F ou Outro). O restante pode ser completado depois.
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
                <Tabs.List grow mb="xl" style={{ backgroundColor: 'var(--hh-raised)', padding: 4, borderRadius: 'var(--hh-radius-card)' }}>
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
                    <Box p="md" style={{ backgroundColor: 'var(--hh-raised)', borderRadius: 'var(--hh-radius-card)', border: '1px solid var(--hh-border)' }}>
                      <Text size="sm" fw={600} c="var(--hh-muted)" mb="sm">
                        Sinais vitais de triagem
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

            <Group justify="flex-end" mt="xl" pt="md" style={{ borderTop: '1px solid var(--hh-border)' }}>
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
        fontWeight: 600,
        '&:hover': { backgroundColor: 'var(--mantine-color-slate-8)' },
      },
    }}
  >
    Entrar
  </Button>
);

export type { Patient };
