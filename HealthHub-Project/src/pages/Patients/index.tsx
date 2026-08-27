import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Text,
  Group,
  SimpleGrid,
  Modal,
  Stack,
  Paper,
  Badge,
  Avatar,
  Skeleton,
  ScrollArea,
  Title,
  ThemeIcon,
  ActionIcon,
  Pagination,
  Center,
  Alert,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconThermometer,
  IconHeartRateMonitor,
  IconDroplet,
  IconUser,
  IconAlertCircle,
  IconStethoscope,
  IconCapsule,
  IconActivity,
  IconId,
  IconPhone,
  IconMapPin,
  IconX,
  IconBed,
  IconClock,
  IconUserPlus,
} from '@tabler/icons-react';
import { FilterField } from '../../components/FilterField';
import { ButtonAddPatient } from '../../components/Buttons';
import CardPatient from '../../components/CardPatient';
import api from '../../services/api';
import { ModalEditPatient } from '../../components/Buttons/ModalEditPatient';
import { PageShell } from '../../components/PageShell';
import type { Patient } from '../../types/patient';
import { useCare, type FilaPaciente } from '../../context/CareContext';

const STATUS_COLOR: Record<string, string> = {
  'Aguardando Triagem': 'blue',
  'Em Triagem (Enfermeiro)': 'cyan',
  'Aguardando Atendimento': 'orange',
  'Em Consulta (Médico)': 'teal',
  'Em Observação': 'indigo',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  'Aguardando Triagem': <IconClock size={18} />,
  'Em Triagem (Enfermeiro)': <IconActivity size={18} />,
  'Aguardando Atendimento': <IconUserPlus size={18} />,
  'Em Consulta (Médico)': <IconStethoscope size={18} />,
  'Em Observação': <IconBed size={18} />,
};

const GRAVIDADE_COLOR: Record<string, string> = {
  Verde: 'green',
  Amarelo: 'yellow',
  Vermelho: 'red',
};

export const Patients = () => {
  const { carePatients } = useCare();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);

  const PAGE_SIZE = 8;

  const loadPatients = useCallback(() => {
    setIsLoading(true);
    api
      .get('/patients')
      .then((response) => setPatients(Array.isArray(response.data) ? response.data : []))
      .catch((err) => console.error('Erro na API:', err))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const filteredPatients = patients.filter(
    (p) =>
      p.nome_completo.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.cpf?.includes(searchFilter),
  );

  const totalPages = Math.ceil(filteredPatients.length / PAGE_SIZE);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function handleSearchChange(value: string) {
    setSearchFilter(value);
    setCurrentPage(1);
  }

  return (
    <PageShell
      title="Gerenciamento de Pacientes"
      description="Acesse o histórico completo e sinais vitais em tempo real"
    >
      <Modal opened={opened} onClose={close} withCloseButton={false} size="xl" centered radius="md" padding={0}>
        {selectedPatient && (() => {
          const cuidado: FilaPaciente | undefined = carePatients.find(
            (c) => c.paciente_id === selectedPatient.id,
          );
          return (
            <Box>
              {/* Header */}
              <Box
                p="lg"
                style={{
                  background: 'linear-gradient(90deg, var(--mantine-color-slate-9), var(--mantine-color-slate-8))',
                }}
              >
                <Group justify="space-between">
                  <Group gap="md">
                    <Avatar size="xl" radius="md" color="gray" variant="light">
                      <IconUser size={32} />
                    </Avatar>
                    <Box>
                      <Title order={3} c="white">{selectedPatient.nome_completo}</Title>
                      <Group gap="xs" mt={4}>
                        <Badge variant="light" color="gray">{selectedPatient.idade} ANOS</Badge>
                        <Badge variant="light" color="gray">{selectedPatient.sexo.toUpperCase()}</Badge>
                      </Group>
                    </Box>
                  </Group>
                  <ActionIcon variant="subtle" color="gray" size="lg" onClick={close}>
                    <IconX size={18} />
                  </ActionIcon>
                </Group>
              </Box>

              {/* Conteúdo */}
              <Box style={{ maxHeight: '62vh', overflowY: 'auto' }}>
                <Stack gap="xl" p="lg">

                  {/* Status na esteira — só exibe quando está na fila */}
                  {cuidado && (
                    <Alert
                      icon={STATUS_ICON[cuidado.status] ?? <IconActivity size={18} />}
                      color={STATUS_COLOR[cuidado.status] ?? 'gray'}
                      variant="light"
                      radius="md"
                      title={cuidado.status}
                    >
                      <Group gap="md" mt={4}>
                        <Text size="sm">
                          Chegada: <Text span fw={700}>{cuidado.chegada}</Text>
                        </Text>
                        <Text size="sm" c="dimmed">·</Text>
                        <Text size="sm">
                          Senha: <Text span fw={700} ff="monospace">{cuidado.senha}</Text>
                        </Text>
                        {cuidado.gravidade && (
                          <Badge color={GRAVIDADE_COLOR[cuidado.gravidade] ?? 'gray'} variant="filled" ml="auto">
                            Risco: {cuidado.gravidade}
                          </Badge>
                        )}
                      </Group>
                    </Alert>
                  )}

                  {/* Dados pessoais */}
                  <Box>
                    <Text size="xs" fw={700} c="slate.5" tt="uppercase" mb="sm">
                      Informações do Cadastro
                    </Text>
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm">
                      {[
                        { label: 'CPF', value: selectedPatient.cpf, icon: IconId },
                        { label: 'RG', value: selectedPatient.rg, icon: IconId },
                        { label: 'Telefone', value: selectedPatient.telefone, icon: IconPhone },
                        { label: 'Endereço', value: selectedPatient.endereco, icon: IconMapPin },
                      ].map(({ label, value, icon: Icon }) => (
                        <Paper key={label} p="sm" radius="md" bg="slate.0" withBorder>
                          <Group gap="sm" wrap="nowrap">
                            <Icon size={20} color="var(--mantine-color-slate-5)" />
                            <Box>
                              <Text size="xs" c="dimmed">{label}</Text>
                              <Text size="sm" fw={600}>{value || 'Não informado'}</Text>
                            </Box>
                          </Group>
                        </Paper>
                      ))}
                    </SimpleGrid>
                  </Box>

                  {/* Sinais vitais */}
                  <Box>
                    <Text size="xs" fw={700} c="slate.5" tt="uppercase" mb="sm">
                      Última Triagem
                    </Text>
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                      {[
                        { label: 'Temperatura', value: selectedPatient.sinaisVitais?.[0]?.temperatura, suffix: '°C', icon: IconThermometer },
                        { label: 'P. Arterial', value: selectedPatient.sinaisVitais?.[0]?.pressao_arterial, suffix: '', icon: IconActivity },
                        { label: 'F. Cardíaca', value: selectedPatient.sinaisVitais?.[0]?.frequencia_cardiaca, suffix: ' bpm', icon: IconHeartRateMonitor },
                        { label: 'SpO₂', value: selectedPatient.sinaisVitais?.[0]?.saturacao_oxigenio, suffix: '%', icon: IconDroplet },
                      ].map(({ label, value, suffix = '', icon: Icon }) => (
                        <Paper key={label} p="md" radius="md" bg="slate.0" withBorder ta="center">
                          <ThemeIcon mx="auto" mb="xs" color="slate" variant="light">
                            <Icon size={18} />
                          </ThemeIcon>
                          <Text size="xs" c="dimmed">{label}</Text>
                          <Text fw={700}>{value ? `${value}${suffix}` : '--'}</Text>
                        </Paper>
                      ))}
                    </SimpleGrid>
                  </Box>

                  {/* Clínico */}
                  {[
                    { title: 'Alergias', value: selectedPatient.alergias, icon: IconAlertCircle },
                    { title: 'Medicamentos', value: selectedPatient.medicamentos_em_uso, icon: IconCapsule },
                    { title: 'Anamnese', value: selectedPatient.anamnese, icon: IconStethoscope },
                  ].map(({ title, value, icon: Icon }) => (
                    <Box key={title}>
                      <Group gap="xs" mb="xs">
                        <Icon size={16} />
                        <Text size="xs" fw={700} c="slate.5" tt="uppercase">{title}</Text>
                      </Group>
                      <Paper p="md" radius="md" bg="slate.0" withBorder>
                        <Text size="sm">{value || 'Não registrado.'}</Text>
                      </Paper>
                    </Box>
                  ))}

                </Stack>
              </Box>
            </Box>
          );
        })()}
      </Modal>

      <ModalEditPatient opened={editOpened} onClose={closeEdit} patient={patientToEdit} onUpdated={loadPatients} />

      <Paper p="md" radius="md" withBorder mb="lg">
        <Group justify="space-between" gap="md">
          <Box style={{ flex: 1, maxWidth: 560 }}>
            <FilterField
              value={searchFilter}
              placeholder="Pesquisar por nome ou CPF..."
              onChange={(e) => handleSearchChange(e.currentTarget.value)}
            />
          </Box>
          <ButtonAddPatient onPatientCreated={loadPatients} />
        </Group>
      </Paper>

      <ScrollArea style={{ flex: 1 }} offsetScrollbars>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, xl: 4 }} spacing="lg">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Paper key={i} withBorder p="lg" h={260}>
                  <Skeleton height={50} circle mb="lg" />
                  <Skeleton height={80} mb="md" />
                  <Group grow>
                    <Skeleton height={36} />
                    <Skeleton height={36} />
                  </Group>
                </Paper>
              ))
            : paginatedPatients.length > 0
              ? paginatedPatients.map((patient) => {
                  const v = patient.sinaisVitais?.[0];
                  return (
                    <CardPatient
                      key={patient.id}
                      patientName={patient.nome_completo}
                      patientAge={patient.idade}
                      patientGender={patient.sexo}
                      temp={v?.temperatura ? `${v.temperatura}°C` : '--'}
                      bpm={v?.frequencia_cardiaca ? `${v.frequencia_cardiaca} bpm` : '--'}
                      spo2={v?.saturacao_oxigenio ? `${v.saturacao_oxigenio}%` : '--'}
                      onView={() => {
                        setSelectedPatient(patient);
                        open();
                      }}
                      onEdit={() => {
                        setPatientToEdit(patient);
                        openEdit();
                      }}
                    />
                  );
                })
              : (
                  <Box py="xl" ta="center" style={{ gridColumn: '1 / -1' }}>
                    <Text fw={600} c="slate.6">
                      Nenhum paciente encontrado
                    </Text>
                  </Box>
                )}
        </SimpleGrid>

        {!isLoading && totalPages > 1 && (
          <Center mt="xl" mb="sm">
            <Pagination
              value={currentPage}
              onChange={setCurrentPage}
              total={totalPages}
              radius="md"
              color="slate"
            />
          </Center>
        )}
      </ScrollArea>
    </PageShell>
  );
};
