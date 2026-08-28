import { useEffect, useState } from 'react';
import {
  Button,
  Modal,
  Text,
  Tabs,
  Stack,
  TextInput,
  Group,
  Textarea,
  Box,
  LoadingOverlay,
  Title,
  ThemeIcon,
  ActionIcon,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconUser,
  IconStethoscope,
  IconClipboardText,
  IconDeviceFloppy,
  IconThermometer,
  IconActivity,
  IconHeartRateMonitor,
  IconDroplet,
  IconX,
} from '@tabler/icons-react';
import api from '../../services/api';
import type { Patient } from '../../types/patient';
import { useCare } from '../../context/CareContext';
import { formatCPF, formatPhone, onlyDigits, stripMask } from '../../utils/formatters';

interface ModalEditProps {
  opened: boolean;
  onClose: () => void;
  patient: Patient | null;
  onUpdated?: () => void;
}

export const ModalEditPatient = ({ opened, onClose, patient, onUpdated }: ModalEditProps) => {
  const [loading, setLoading] = useState(false);
  const { isInObservation } = useCare();

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
      pressao_arterial: '',
      frequencia_cardiaca: '',
      saturacao_oxigenio: '',
    },
    validate: {
      nome_completo: (value) => (value.trim().length < 3 ? 'Nome muito curto' : null),
    },
  });

  useEffect(() => {
    if (opened && patient) {
      const ultimaMedicao = patient.sinaisVitais?.[0];
      form.setValues({
        nome_completo: patient.nome_completo || '',
        rg: patient.rg || '',
        cpf: patient.cpf || '',
        idade: patient.idade ? String(patient.idade) : '',
        sexo: patient.sexo || '',
        telefone: patient.telefone || '',
        endereco: patient.endereco || '',
        alergias: patient.alergias || '',
        medicamentos_em_uso: patient.medicamentos_em_uso || '',
        anamnese: patient.anamnese || '',
        temperatura: ultimaMedicao?.temperatura || '',
        pressao_arterial: ultimaMedicao?.pressao_arterial || '',
        frequencia_cardiaca: ultimaMedicao?.frequencia_cardiaca || '',
        saturacao_oxigenio: ultimaMedicao?.saturacao_oxigenio || '',
      });
    }
  }, [opened, patient]);

  const handleUpdate = async (values: typeof form.values) => {
    if (!patient) return;
    setLoading(true);
    try {
      const inObservation = isInObservation(patient.id);

      if (inObservation) {
        // Paciente em Ala de Observação: salva dados cadastrais sem sobrescrever sinais,
        // depois cria um NOVO registro de sinais vitais para acumular histórico de amostras.
        await api.put(`/patients/${patient.id}`, {
          nome_completo: values.nome_completo,
          rg: values.rg,
          cpf: values.cpf ? stripMask(values.cpf) : undefined,
          idade: Number(values.idade),
          sexo: values.sexo,
          telefone: values.telefone ? stripMask(values.telefone) : undefined,
          endereco: values.endereco,
          alergias: values.alergias,
          medicamentos_em_uso: values.medicamentos_em_uso,
          anamnese: values.anamnese,
          // sem campos vitais → o PUT não toca no registro existente de sinais
        });

        const temSinais =
          values.temperatura ||
          values.frequencia_cardiaca ||
          values.saturacao_oxigenio ||
          values.pressao_arterial;

        if (temSinais) {
          await api.post(`/sinais/${patient.id}`, {
            temperatura: values.temperatura ? Number(values.temperatura) : undefined,
            frequencia_cardiaca: values.frequencia_cardiaca
              ? Number(values.frequencia_cardiaca)
              : undefined,
            saturacao_oxigenio: values.saturacao_oxigenio
              ? Number(values.saturacao_oxigenio)
              : undefined,
            pressao_arterial: values.pressao_arterial || undefined,
          });
        }
      } else {
        // Fora da esteira: comportamento normal, atualiza o registro mais recente de sinais.
        await api.put(`/patients/${patient.id}`, {
          nome_completo: values.nome_completo,
          rg: values.rg,
          cpf: values.cpf ? stripMask(values.cpf) : undefined,
          idade: Number(values.idade),
          sexo: values.sexo,
          telefone: values.telefone ? stripMask(values.telefone) : undefined,
          endereco: values.endereco,
          alergias: values.alergias,
          medicamentos_em_uso: values.medicamentos_em_uso,
          anamnese: values.anamnese,
          temperatura: values.temperatura ? Number(values.temperatura) : undefined,
          frequencia_cardiaca: values.frequencia_cardiaca
            ? Number(values.frequencia_cardiaca)
            : undefined,
          saturacao_oxigenio: values.saturacao_oxigenio
            ? Number(values.saturacao_oxigenio)
            : undefined,
          pressao_arterial: values.pressao_arterial || undefined,
        });
      }

      onClose();
      onUpdated?.();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} withCloseButton={false} centered size="lg" radius="lg" padding={0}>
      <Box pos="relative">
        <LoadingOverlay visible={loading} />

        <form onSubmit={form.onSubmit(handleUpdate)}>
          <Box p="lg" style={{ background: 'oklch(0.24 0.02 240)' }}>
            <Group justify="space-between">
              <Group gap="md">
                <ThemeIcon size="xl" radius="md" variant="light" color="gray">
                  <IconUser size={24} />
                </ThemeIcon>
                <Box>
                  <Title order={4} c="white" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    Editar Prontuário
                  </Title>
                  <Text size="xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'oklch(0.65 0.03 230)' }}>
                    {patient?.nome_completo}
                  </Text>
                </Box>
              </Group>
              <ActionIcon variant="subtle" color="gray" onClick={onClose}>
                <IconX size={18} />
              </ActionIcon>
            </Group>
          </Box>

          <Box p="lg" mih={300} mah="65vh" style={{ overflowY: 'auto' }}>
            <Tabs color="slate" defaultValue="pessoais" variant="pills">
              <Tabs.List grow mb="xl">
                <Tabs.Tab value="pessoais" leftSection={<IconUser size={16} />}>
                  Pessoais
                </Tabs.Tab>
                <Tabs.Tab value="hospitalares" leftSection={<IconStethoscope size={16} />}>
                  Sinais & Triagem
                </Tabs.Tab>
                <Tabs.Tab value="anamnese" leftSection={<IconClipboardText size={16} />}>
                  Anamnese
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="pessoais">
                <Stack gap="md">
                  <TextInput label="Nome Completo" required maxLength={100} {...form.getInputProps('nome_completo')} />
                  <Group grow>
                    <TextInput label="RG" maxLength={12} {...form.getInputProps('rg')} />
                    <TextInput
                      label="CPF"
                      placeholder="000.000.000-00"
                      maxLength={14}
                      {...form.getInputProps('cpf')}
                      onChange={(e) => form.setFieldValue('cpf', formatCPF(e.currentTarget.value))}
                    />
                  </Group>
                  <Group grow>
                    <TextInput
                      label="Idade"
                      maxLength={3}
                      {...form.getInputProps('idade')}
                      onChange={(e) => form.setFieldValue('idade', onlyDigits(e.currentTarget.value, 3))}
                    />
                    <TextInput label="Sexo" maxLength={20} {...form.getInputProps('sexo')} />
                  </Group>
                  <TextInput
                    label="Telefone"
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    {...form.getInputProps('telefone')}
                    onChange={(e) => form.setFieldValue('telefone', formatPhone(e.currentTarget.value))}
                  />
                  <TextInput label="Endereço" maxLength={200} {...form.getInputProps('endereco')} />
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="hospitalares">
                <Stack gap="md">
                  <Group grow>
                    <TextInput
                      label="Temperatura"
                      placeholder="37.5"
                      maxLength={5}
                      leftSection={<IconThermometer size={16} />}
                      {...form.getInputProps('temperatura')}
                    />
                    <TextInput
                      label="SpO₂"
                      placeholder="98"
                      maxLength={3}
                      leftSection={<IconDroplet size={16} />}
                      {...form.getInputProps('saturacao_oxigenio')}
                      onChange={(e) => form.setFieldValue('saturacao_oxigenio', onlyDigits(e.currentTarget.value, 3))}
                    />
                  </Group>
                  <Group grow>
                    <TextInput
                      label="Pressão"
                      placeholder="120/80"
                      maxLength={7}
                      leftSection={<IconActivity size={16} />}
                      {...form.getInputProps('pressao_arterial')}
                    />
                    <TextInput
                      label="FC (bpm)"
                      placeholder="72"
                      maxLength={3}
                      leftSection={<IconHeartRateMonitor size={16} />}
                      {...form.getInputProps('frequencia_cardiaca')}
                      onChange={(e) => form.setFieldValue('frequencia_cardiaca', onlyDigits(e.currentTarget.value, 3))}
                    />
                  </Group>
                  <TextInput label="Alergias" maxLength={300} {...form.getInputProps('alergias')} />
                  <TextInput label="Medicamentos" maxLength={300} {...form.getInputProps('medicamentos_em_uso')} />
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="anamnese">
                <Textarea label="Anamnese" minRows={6} {...form.getInputProps('anamnese')} />
              </Tabs.Panel>
            </Tabs>
          </Box>

          <Group justify="flex-end" p="md" style={{ borderTop: '1px solid oklch(0.90 0.01 220)', backgroundColor: 'var(--mantine-color-slate-0)' }}>
            <Button variant="subtle" color="gray" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" color="slate" leftSection={<IconDeviceFloppy size={18} />}>
              Salvar Alterações
            </Button>
          </Group>
        </form>
      </Box>
    </Modal>
  );
};
