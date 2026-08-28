import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Text, Group, SimpleGrid, Modal, Stack, Paper, Badge,
  Avatar, Skeleton, ScrollArea, ThemeIcon, ActionIcon,
  Pagination, Center, Alert, TextInput, Divider,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconThermometer, IconHeartRateMonitor, IconDroplet,
  IconUser, IconAlertCircle, IconStethoscope, IconCapsule,
  IconActivity, IconId, IconPhone, IconMapPin, IconX,
  IconBed, IconClock, IconUserPlus, IconUsers, IconSearch,
} from '@tabler/icons-react';
import { ButtonAddPatient } from '../../components/Buttons';
import CardPatient from '../../components/CardPatient';
import api from '../../services/api';
import { manchesterCSSColor } from '../../utils/vitalStatus';
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
  'Aguardando Triagem': <IconClock size={16} />,
  'Em Triagem (Enfermeiro)': <IconActivity size={16} />,
  'Aguardando Atendimento': <IconUserPlus size={16} />,
  'Em Consulta (Médico)': <IconStethoscope size={16} />,
  'Em Observação': <IconBed size={16} />,
};

const GRAVIDADE_COLOR: Record<string, string> = {
  Vermelho: 'red', Laranja: 'orange', Amarelo: 'yellow', Verde: 'green', Azul: 'blue',
};

function getInitials(name: string) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

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
      .then((res) => setPatients(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error('Erro na API:', err))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);

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
      title="Pacientes"
      description="Histórico clínico, sinais vitais e gestão de prontuários"
      icon={<IconUsers size={24} />}
    >
      {/* Modal: Visualizar paciente */}
      <Modal
        opened={opened}
        onClose={close}
        withCloseButton={false}
        size="xl"
        centered
        radius="lg"
        padding={0}
      >
        {selectedPatient && (() => {
          const cuidado: FilaPaciente | undefined = carePatients.find(
            (c) => c.paciente_id === selectedPatient.id,
          );
          return (
            <Box>
              {/* Header */}
              <Box p="lg" style={{ background: 'oklch(0.24 0.02 240)' }}>
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="md" wrap="nowrap">
                    <Avatar
                      size={52}
                      radius="md"
                      color="slate"
                      variant="light"
                      style={{ fontSize: 18, fontWeight: 800 }}
                    >
                      {getInitials(selectedPatient.nome_completo)}
                    </Avatar>
                    <Box>
                      <Text fw={800} size="lg" c="white" style={{ fontFamily: "'Manrope', sans-serif", lineHeight: 1.2 }}>
                        {selectedPatient.nome_completo}
                      </Text>
                      <Group gap="xs" mt={4}>
                        {selectedPatient.idade && (
                          <Text size="xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'oklch(0.65 0.03 230)' }}>
                            {selectedPatient.idade} anos
                          </Text>
                        )}
                        {selectedPatient.sexo && (
                          <Text size="xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'oklch(0.65 0.03 230)' }}>
                            · {selectedPatient.sexo}
                          </Text>
                        )}
                      </Group>
                    </Box>
                  </Group>
                  <ActionIcon variant="subtle" color="gray" size="lg" onClick={close}>
                    <IconX size={18} />
                  </ActionIcon>
                </Group>
              </Box>

              {/* Corpo */}
              <Box style={{ maxHeight: '62vh', overflowY: 'auto' }}>
                <Stack gap="xl" p="lg">

                  {/* Status na esteira */}
                  {cuidado && (
                    <Alert
                      icon={STATUS_ICON[cuidado.status] ?? <IconActivity size={16} />}
                      color={STATUS_COLOR[cuidado.status] ?? 'gray'}
                      variant="light"
                      radius="md"
                      title={cuidado.status}
                    >
                      <Group gap="md" mt={4} wrap="wrap">
                        <Text size="sm">Chegada: <Text span fw={700}>{cuidado.chegada}</Text></Text>
                        <Text size="sm" c="dimmed">·</Text>
                        <Text size="sm">Senha: <Text span fw={700} ff="monospace">{cuidado.senha}</Text></Text>
                        {cuidado.gravidade && (
                          <Badge color={GRAVIDADE_COLOR[cuidado.gravidade] ?? 'gray'} variant="filled" radius="sm" ml="auto">
                            Risco: {cuidado.gravidade}
                          </Badge>
                        )}
                      </Group>
                    </Alert>
                  )}

                  {/* Dados pessoais */}
                  <Box>
                    <Group gap="xs" mb="sm">
                      <ThemeIcon size="sm" radius="md" color="slate" variant="light">
                        <IconUser size={12} />
                      </ThemeIcon>
                      <Text size="xs" fw={700} c="slate.5" tt="uppercase" style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.1em' }}>
                        Informações do Cadastro
                      </Text>
                    </Group>
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm">
                      {[
                        { label: 'CPF', value: selectedPatient.cpf, icon: IconId },
                        { label: 'RG', value: selectedPatient.rg, icon: IconId },
                        { label: 'Telefone', value: selectedPatient.telefone, icon: IconPhone },
                        { label: 'Endereço', value: selectedPatient.endereco, icon: IconMapPin },
                      ].map(({ label, value, icon: Icon }) => (
                        <Paper
                          key={label}
                          p="sm"
                          radius="md"
                          style={{ border: '1px solid oklch(0.90 0.01 220)', background: 'var(--mantine-color-slate-0)' }}
                        >
                          <Group gap="sm" wrap="nowrap">
                            <Icon size={18} color="oklch(0.52 0.14 235)" />
                            <Box style={{ minWidth: 0 }}>
                              <Text size="10px" c="dimmed" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{label}</Text>
                              <Text size="sm" fw={600} truncate>{value || 'Não informado'}</Text>
                            </Box>
                          </Group>
                        </Paper>
                      ))}
                    </SimpleGrid>
                  </Box>

                  {/* Sinais vitais */}
                  <Box>
                    <Group gap="xs" mb="sm">
                      <ThemeIcon size="sm" radius="md" color="slate" variant="light">
                        <IconHeartRateMonitor size={12} />
                      </ThemeIcon>
                      <Text size="xs" fw={700} c="slate.5" tt="uppercase" style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.1em' }}>
                        Última Triagem
                      </Text>
                    </Group>
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                      {[
                        { label: 'Temperatura', value: selectedPatient.sinaisVitais?.[0]?.temperatura, suffix: '°C', icon: IconThermometer },
                        { label: 'P. Arterial', value: selectedPatient.sinaisVitais?.[0]?.pressao_arterial, suffix: '', icon: IconActivity },
                        { label: 'F. Cardíaca', value: selectedPatient.sinaisVitais?.[0]?.frequencia_cardiaca, suffix: ' bpm', icon: IconHeartRateMonitor },
                        { label: 'SpO₂', value: selectedPatient.sinaisVitais?.[0]?.saturacao_oxigenio, suffix: '%', icon: IconDroplet },
                      ].map(({ label, value, suffix = '', icon: Icon }) => (
                        <Paper
                          key={label}
                          p="md"
                          radius="md"
                          style={{ border: '1px solid oklch(0.90 0.01 220)', textAlign: 'center', borderTop: '3px solid oklch(0.24 0.02 240)' }}
                        >
                          <ThemeIcon mx="auto" mb="xs" color="slate" variant="light" radius="md">
                            <Icon size={16} />
                          </ThemeIcon>
                          <Text size="10px" c="dimmed" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{label}</Text>
                          <Text fw={800} size="lg" c="slate.8">{value ? `${value}${suffix}` : '--'}</Text>
                        </Paper>
                      ))}
                    </SimpleGrid>
                  </Box>

                  {/* Clínico */}
                  {[
                    { title: 'Alergias', value: selectedPatient.alergias, icon: IconAlertCircle },
                    { title: 'Medicamentos em Uso', value: selectedPatient.medicamentos_em_uso, icon: IconCapsule },
                    { title: 'Anamnese', value: selectedPatient.anamnese, icon: IconStethoscope },
                  ].map(({ title, value, icon: Icon }) => value ? (
                    <Box key={title}>
                      <Group gap="xs" mb="sm">
                        <ThemeIcon size="sm" radius="md" color="slate" variant="light">
                          <Icon size={12} />
                        </ThemeIcon>
                        <Text size="xs" fw={700} c="slate.5" tt="uppercase" style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.1em' }}>
                          {title}
                        </Text>
                      </Group>
                      <Paper p="md" radius="md" style={{ border: '1px solid oklch(0.90 0.01 220)', background: 'var(--mantine-color-slate-0)' }}>
                        <Text size="sm" c="slate.7" style={{ lineHeight: 1.7 }}>{value}</Text>
                      </Paper>
                    </Box>
                  ) : null)}

                </Stack>
              </Box>
            </Box>
          );
        })()}
      </Modal>

      <ModalEditPatient
        opened={editOpened}
        onClose={closeEdit}
        patient={patientToEdit}
        onUpdated={loadPatients}
      />

      {/* ── Barra de busca + ação ── */}
      <Box mb="lg" style={{ flexShrink: 0 }}>
        <Group gap="md">
          <TextInput
            style={{ flex: 1 }}
            size="md"
            radius="md"
            placeholder="Pesquisar por nome ou CPF..."
            leftSection={<IconSearch size={16} color="oklch(0.65 0.03 230)" />}
            value={searchFilter}
            onChange={(e) => handleSearchChange(e.currentTarget.value)}
            styles={{
              input: {
                border: '1.5px solid oklch(0.88 0.01 220)',
                background: '#fff',
                '&:focus': { borderColor: 'oklch(0.52 0.14 235)' },
              },
            }}
          />
          <ButtonAddPatient onPatientCreated={loadPatients} />
        </Group>

        {/* Contadores */}
        {!isLoading && (
          <Group gap="xs" mt="sm">
            <Text size="xs" c="dimmed" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {filteredPatients.length} paciente{filteredPatients.length !== 1 ? 's' : ''}
              {searchFilter && ` · filtrado${filteredPatients.length !== 1 ? 's' : ''}`}
            </Text>
            {searchFilter && filteredPatients.length === 0 && (
              <Text size="xs" c="hub.6" fw={600}>— tente outro termo</Text>
            )}
          </Group>
        )}
      </Box>

      {/* ── Grade de pacientes ── */}
      <ScrollArea style={{ flex: 1 }} offsetScrollbars>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, xl: 4 }} spacing="md">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Paper key={i} radius="lg" style={{ overflow: 'hidden', border: '1px solid oklch(0.90 0.01 220)' }}>
                  <Box h={5} style={{ background: 'oklch(0.88 0.04 235)' }} />
                  <Box p="lg">
                    <Group mb="md">
                      <Skeleton height={48} circle />
                      <Box style={{ flex: 1 }}>
                        <Skeleton height={14} mb={6} />
                        <Skeleton height={11} w="60%" />
                      </Box>
                    </Group>
                    <Skeleton height={64} radius="md" mb="md" />
                    <Group grow>
                      <Skeleton height={36} radius="md" />
                      <Skeleton height={36} radius="md" />
                    </Group>
                  </Box>
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
                      topColor={manchesterCSSColor(
                        carePatients.find(c => c.paciente_id === patient.id)?.gravidade
                      )}
                      onView={() => { setSelectedPatient(patient); open(); }}
                      onEdit={() => { setPatientToEdit(patient); openEdit(); }}
                    />
                  );
                })
              : (
                  <Box py="xl" style={{ gridColumn: '1 / -1' }}>
                    <Center>
                      <Stack align="center" gap="md">
                        <ThemeIcon size={72} radius="xl" color="slate" variant="light">
                          <IconUsers size={36} />
                        </ThemeIcon>
                        <Box ta="center">
                          <Text fw={700} size="lg" c="slate.7" mb={4}>
                            {searchFilter ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
                          </Text>
                          <Text size="sm" c="dimmed" maw={280} mx="auto">
                            {searchFilter
                              ? `Não encontramos resultados para "${searchFilter}". Tente outro nome ou CPF.`
                              : 'Cadastre o primeiro paciente clicando no botão "Adicionar Paciente".'}
                          </Text>
                        </Box>
                      </Stack>
                    </Center>
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
