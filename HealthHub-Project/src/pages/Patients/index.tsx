import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Text, Group, SimpleGrid, Modal, Stack, Paper, Badge,
  Avatar, ScrollArea, ActionIcon, Pagination, TextInput, Tabs, Timeline, Title, Skeleton,
  SegmentedControl,
} from '@mantine/core';
import { AdmitirModal } from '../../components/AdmitirModal';
import { useHistoricoPacientes } from '../../hooks/useMetricas';
import { formatDuracao, tempoAtras } from '../../services/metricas';
import { AVISO_RASTREABILIDADE, rotuloEvento, rotuloPerfil, type EventoApi } from '../../utils/eventos';
import { useDisclosure } from '@mantine/hooks';
import {
  IconUsers, IconSearch, IconX, IconHistory, IconUser, IconCalendar,
} from '@tabler/icons-react';
import { ButtonAddPatient } from '../../components/Buttons';
import CardPatient from '../../components/CardPatient';
import api from '../../services/api';
import { riscoCSSColor } from '../../utils/vitalStatus';
import { ModalEditPatient } from '../../components/Buttons/ModalEditPatient';
import { PageShell } from '../../components/PageShell';
import { EmptyState, ErrorState } from '../../components/ui';
import type { Patient } from '../../types/patient';
import { useCare, type FilaPaciente } from '../../context/CareContext';
import { chatService } from '../../services/chatService';
import { useAuth } from '../../context/AuthContext';

// Cores de dado (categoria de risco e etapa do cuidado) — significado clínico, não decoração
const STATUS_COLOR: Record<string, string> = {
  'Aguardando Triagem': 'blue',
  'Em Triagem (Enfermeiro)': 'cyan',
  'Aguardando Atendimento': 'orange',
  'Em Consulta (Médico)': 'teal',
  'Em Observação': 'indigo',
};

const GRAVIDADE_COLOR: Record<string, string> = {
  Vermelho: 'red', Laranja: 'orange', Amarelo: 'yellow', Verde: 'green', Azul: 'blue',
};

const DESFECHO_COLOR: Record<string, string> = {
  'Em Atendimento': 'blue', Alta: 'green', Internacao: 'orange',
  Transferencia: 'violet', 'Saida Voluntaria': 'gray',
};

function getInitials(name: string) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Box>
      <Text fw={600} size="sm" c="var(--hh-ink)" mb="xs">{titulo}</Text>
      {children}
    </Box>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor?: string | number | null }) {
  const ausente = valor === undefined || valor === null || valor === '';
  return (
    <Box style={{ minWidth: 0 }}>
      <Text size="xs" c="var(--hh-muted)">{rotulo}</Text>
      <Text size="sm" fw={500} c={ausente ? 'var(--hh-faint)' : 'var(--hh-ink)'} truncate>
        {ausente ? 'Não informado' : valor}
      </Text>
    </Box>
  );
}

export const Patients = () => {
  const { carePatients } = useCare();
  const { role } = useAuth();
  // O backend só aceita edição de prontuário por médico e enfermeiro (recepção recebe 403)
  const podeEditar = role === 'medico' || role === 'enfermeiro';
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [visitas, setVisitas] = useState<any[]>([]);
  const [loadingVisitas, setLoadingVisitas] = useState(false);
  const [eventos, setEventos] = useState<EventoApi[]>([]);
  // Ativos: na esteira ou nunca atendidos. Com alta: saíram e podem ser readmitidos.
  const [aba, setAba] = useState<'ativos' | 'alta'>('ativos');
  const [readmitirId, setReadmitirId] = useState<string | null>(null);
  const { historico } = useHistoricoPacientes();

  const PAGE_SIZE = 8;

  const loadPatients = useCallback(() => {
    setIsLoading(true);
    api
      .get('/patients', { params: { ativo: aba === 'ativos' } })
      .then((res) => {
        setPatients(Array.isArray(res.data) ? res.data : []);
        setLoadError(false);
      })
      .catch((err) => {
        console.error('Erro na API:', err);
        setLoadError(true);
      })
      .finally(() => setIsLoading(false));
  }, [aba]);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  // Alta/readmissão em outra sessão muda quem aparece aqui — mantém sincronizado
  useEffect(() => chatService.onFilaChanged(loadPatients), [loadPatients]);

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

  // Carrega histórico de visitas quando abre o modal
  function openPatientModal(patient: Patient) {
    setSelectedPatient(patient);
    setVisitas([]);
    setEventos([]);
    setLoadingVisitas(true);
    // Registro de rastreabilidade: só médico e enfermeiro (o backend recusa a recepção)
    if (podeEditar) api.get(`/patients/${patient.id}/eventos`).then((r) => setEventos(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get(`/patients/${patient.id}/visitas`)
      .then(r => setVisitas(r.data?.visitas ?? []))
      .catch(() => {})
      .finally(() => setLoadingVisitas(false));
    open();
  }

  return (
    <PageShell
      title="Pacientes"
      description="Histórico clínico, sinais vitais e gestão de prontuários"
      icon={<IconUsers size={22} />}
    >
      {/* Modal: Visualizar paciente */}
      <Modal opened={opened} onClose={close} withCloseButton={false} size="xl" centered padding={0}>
        {selectedPatient && (() => {
          const cuidado: FilaPaciente | undefined = carePatients.find(
            (c) => c.paciente_id === selectedPatient.id,
          );
          const ultima = selectedPatient.sinaisVitais?.[0];
          const sinais = [
            { rotulo: 'Temperatura', valor: ultima?.temperatura, unidade: '°C' },
            { rotulo: 'Pressão arterial', valor: ultima?.pressao_arterial, unidade: '' },
            { rotulo: 'Frequência cardíaca', valor: ultima?.frequencia_cardiaca, unidade: ' bpm' },
            { rotulo: 'SpO₂', valor: ultima?.saturacao_oxigenio, unidade: '%' },
          ];
          return (
            <Box>
              <Group justify="space-between" wrap="nowrap" p="lg" style={{ borderBottom: '1px solid var(--hh-border)' }}>
                <Group gap="md" wrap="nowrap">
                  <Avatar size={44} radius="md" color="slate" variant="light">
                    {getInitials(selectedPatient.nome_completo)}
                  </Avatar>
                  <Box>
                    <Title order={3} size={18} fw={600} c="var(--hh-ink)" lh={1.2}>
                      {selectedPatient.nome_completo}
                    </Title>
                    <Text size="sm" c="var(--hh-muted)">
                      {[selectedPatient.idade ? `${selectedPatient.idade} anos` : null, selectedPatient.sexo].filter(Boolean).join(' · ')}
                    </Text>
                  </Box>
                </Group>
                <ActionIcon variant="subtle" color="slate" size="lg" onClick={close} aria-label="Fechar prontuário">
                  <IconX size={18} />
                </ActionIcon>
              </Group>

              <Tabs defaultValue="dados" color="slate">
                <Tabs.List px="lg">
                  <Tabs.Tab value="dados" leftSection={<IconUser size={14} />}>Dados clínicos</Tabs.Tab>
                  <Tabs.Tab
                    value="historico"
                    leftSection={<IconHistory size={14} />}
                    rightSection={visitas.length > 0
                      ? <Badge size="xs" color="slate" variant="light">{visitas.length}</Badge>
                      : undefined}
                  >
                    Histórico de visitas
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="dados">
                  <ScrollArea.Autosize mah="55vh">
                    <Stack gap="xl" p="lg">
                      {cuidado && (
                        <Paper withBorder p="sm">
                          <Group gap="md" wrap="wrap">
                            <Badge color={STATUS_COLOR[cuidado.status] ?? 'gray'} variant="light">{cuidado.status}</Badge>
                            <Text size="sm" c="var(--hh-muted)">Chegada <Text span fw={600} c="var(--hh-ink)">{cuidado.chegada}</Text></Text>
                            <Text size="sm" c="var(--hh-muted)">Senha <Text span fw={600} c="var(--hh-ink)" ff="monospace">{cuidado.senha}</Text></Text>
                            {cuidado.gravidade && (
                              <Badge color={GRAVIDADE_COLOR[cuidado.gravidade] ?? 'gray'} variant="filled" ml="auto">
                                Risco {cuidado.gravidade}
                              </Badge>
                            )}
                          </Group>
                        </Paper>
                      )}

                      <Secao titulo="Cadastro">
                        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                          <Campo rotulo="CPF" valor={selectedPatient.cpf} />
                          <Campo rotulo="RG" valor={selectedPatient.rg} />
                          <Campo rotulo="Telefone" valor={selectedPatient.telefone} />
                          <Campo rotulo="Endereço" valor={selectedPatient.endereco} />
                        </SimpleGrid>
                      </Secao>

                      <Secao titulo="Última triagem">
                        <Paper withBorder style={{ overflow: 'hidden' }}>
                          <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1, background: 'var(--hh-border)' }}>
                            {sinais.map(({ rotulo, valor, unidade }) => (
                              <Box key={rotulo} p="md" style={{ background: 'var(--hh-surface)' }}>
                                <Text size="xs" c="var(--hh-muted)">{rotulo}</Text>
                                {valor ? (
                                  <Text fw={600} size="xl" c="var(--hh-ink)" lh={1.2}>{valor}{unidade}</Text>
                                ) : (
                                  <Text fw={600} size="xl" c="var(--hh-faint)" lh={1.2} aria-label="sem valor">—</Text>
                                )}
                              </Box>
                            ))}
                          </Box>
                        </Paper>
                      </Secao>

                      {[
                        { titulo: 'Alergias', valor: selectedPatient.alergias },
                        { titulo: 'Medicamentos em uso', valor: selectedPatient.medicamentos_em_uso },
                        { titulo: 'Anamnese', valor: selectedPatient.anamnese },
                      ].map(({ titulo, valor }) => valor ? (
                        <Secao key={titulo} titulo={titulo}>
                          <Paper p="md" bg="var(--hh-raised)">
                            <Text size="sm" c="var(--hh-ink)" style={{ lineHeight: 1.6 }}>{valor}</Text>
                          </Paper>
                        </Secao>
                      ) : null)}
                    </Stack>
                  </ScrollArea.Autosize>
                </Tabs.Panel>

                <Tabs.Panel value="historico">
                  <ScrollArea.Autosize mah="55vh">
                    <Box p="lg">
                      {loadingVisitas ? (
                        <Stack gap="xs">
                          {[0, 1, 2].map((i) => <Skeleton key={i} h={56} />)}
                        </Stack>
                      ) : visitas.length === 0 ? (
                        <EmptyState message="Nenhuma visita registrada. O histórico aparece ao admitir o paciente na esteira." />
                      ) : (
                        <Timeline active={0} bulletSize={20} lineWidth={2} color="slate">
                          {visitas.map((v, i) => (
                            <Timeline.Item
                              key={v.id}
                              bullet={<IconCalendar size={10} />}
                              title={
                                <Group gap="xs" wrap="nowrap">
                                  <Text size="sm" fw={600}>Visita {visitas.length - i}</Text>
                                  {v.classificacao_risco && (
                                    <Badge size="xs" color={GRAVIDADE_COLOR[v.classificacao_risco] ?? 'gray'} variant="filled">
                                      {v.classificacao_risco}
                                    </Badge>
                                  )}
                                  <Badge size="xs" color={DESFECHO_COLOR[v.desfecho] ?? 'gray'} variant="light">
                                    {v.desfecho}
                                  </Badge>
                                </Group>
                              }
                            >
                              <Text size="xs" c="var(--hh-muted)" mt={4}>
                                Chegada: {new Date(v.chegada).toLocaleString('pt-BR')}
                              </Text>
                              {v.alta && (
                                <Text size="xs" c="var(--hh-muted)">
                                  Alta: {new Date(v.alta).toLocaleString('pt-BR')}
                                  {' · '}
                                  {formatDuracao(Math.round((new Date(v.alta).getTime() - new Date(v.chegada).getTime()) / 60000))}
                                </Text>
                              )}
                              {v.motivo_visita && (
                                <Text size="xs" c="var(--hh-ink)" mt={2}>Motivo: {v.motivo_visita}</Text>
                              )}
                            </Timeline.Item>
                          ))}
                        </Timeline>
                      )}

                      {podeEditar && (
                        <Box mt="xl" data-testid="registro-eventos">
                          <Text fw={600} size="sm" c="var(--hh-ink)">Registro de eventos</Text>
                          <Text size="xs" c="var(--hh-muted)" mt={2} mb="sm">{AVISO_RASTREABILIDADE}</Text>
                          {eventos.length === 0 ? (
                            <Text size="sm" c="var(--hh-faint)">Nenhum evento registrado para este paciente (registros anteriores a esta função não têm autoria).</Text>
                          ) : (
                            <Box style={{ borderTop: '1px solid var(--hh-rule)' }}>
                              {eventos.map((e, i) => (
                                <Group key={e.id ?? i} py={8} gap="sm" wrap="nowrap" align="flex-start" style={{ borderBottom: '1px solid var(--hh-rule)' }}>
                                  <Text size="xs" c="var(--hh-faint)" w={92} style={{ flexShrink: 0 }}>
                                    {e.criado_em ? new Date(e.criado_em + (e.criado_em.endsWith('Z') ? '' : 'Z')).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                                  </Text>
                                  <Box style={{ flex: 1, minWidth: 0 }}>
                                    <Text size="sm" c="var(--hh-ink)">{rotuloEvento(e)}</Text>
                                    <Text size="xs" c="var(--hh-muted)">{e.usuario_nome ? `${e.usuario_nome} · ` : ''}{rotuloPerfil(e.usuario_role)}</Text>
                                    {e.justificativa && <Text size="xs" c="var(--hh-muted)" fs="italic">Justificativa: {e.justificativa}</Text>}
                                  </Box>
                                </Group>
                              ))}
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                  </ScrollArea.Autosize>
                </Tabs.Panel>
              </Tabs>
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

      <AdmitirModal
        opened={readmitirId !== null}
        onClose={() => setReadmitirId(null)}
        pacienteInicialId={readmitirId}
      />

      {/* Busca + ação principal */}
      <Box mb="lg" style={{ flexShrink: 0 }}>
        <Group gap="md" wrap="wrap">
          <SegmentedControl
            value={aba}
            onChange={(v) => { setAba(v as 'ativos' | 'alta'); setCurrentPage(1); }}
            data={[
              { value: 'ativos', label: 'Ativos' },
              { value: 'alta', label: 'Com alta' },
            ]}
            aria-label="Filtrar pacientes por situação"
            transitionDuration={180}
            transitionTimingFunction="cubic-bezier(0.2, 0.8, 0.2, 1)"
          />
          <TextInput
            style={{ flex: 1, minWidth: 220 }}
            placeholder="Pesquisar por nome ou CPF"
            aria-label="Pesquisar paciente por nome ou CPF"
            leftSection={<IconSearch size={14} />}
            value={searchFilter}
            onChange={(e) => handleSearchChange(e.currentTarget.value)}
          />
          <ButtonAddPatient onPatientCreated={loadPatients} />
        </Group>

        {!isLoading && !loadError && (
          <Text size="sm" c="var(--hh-muted)" mt="sm">
            {filteredPatients.length} paciente{filteredPatients.length !== 1 ? 's' : ''}
            {aba === 'alta' ? ' com alta' : filteredPatients.length !== 1 ? ' ativos' : ' ativo'}
            {searchFilter && `, busca "${searchFilter}"`}
          </Text>
        )}
      </Box>

      {/* Grade de pacientes */}
      <ScrollArea style={{ flex: 1 }} offsetScrollbars>
        {loadError ? (
          <ErrorState message="Não foi possível carregar os pacientes." onRetry={loadPatients} />
        ) : (
          <SimpleGrid key={`${aba}-${currentPage}`} className="hh-stagger" cols={{ base: 1, sm: 2, md: 3, xl: 4 }} spacing="md">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <Paper key={i} withBorder p="md">
                    <Group mb="md" wrap="nowrap">
                      <Skeleton h={36} w={36} />
                      <Box style={{ flex: 1 }}>
                        <Skeleton h={14} mb={6} />
                        <Skeleton h={12} w="60%" />
                      </Box>
                    </Group>
                    <Skeleton h={36} mb="md" />
                    <Skeleton h={30} />
                  </Paper>
                ))
              : paginatedPatients.length > 0
                ? paginatedPatients.map((patient) => {
                    const v = patient.sinaisVitais?.[0];
                    const h = historico[patient.id];
                    const rodape = h
                      ? [
                          h.total === 1 ? '1 visita' : `${h.total} visitas`,
                          h.ultima.alta ? `alta ${tempoAtras(h.ultima.alta)}` : `chegada ${tempoAtras(h.ultima.chegada)}`,
                        ].join(' · ')
                      : 'Nenhuma visita registrada';
                    return (
                      <CardPatient
                        key={patient.id}
                        patientName={patient.nome_completo}
                        patientAge={patient.idade}
                        patientGender={patient.sexo}
                        temp={v?.temperatura ? `${v.temperatura}°C` : '--'}
                        bpm={v?.frequencia_cardiaca ? `${v.frequencia_cardiaca} bpm` : '--'}
                        spo2={v?.saturacao_oxigenio ? `${v.saturacao_oxigenio}%` : '--'}
                        topColor={riscoCSSColor(
                          carePatients.find(c => c.paciente_id === patient.id)?.gravidade
                        )}
                        onView={() => openPatientModal(patient)}
                        onEdit={podeEditar ? () => { setPatientToEdit(patient); openEdit(); } : undefined}
                        onReadmit={aba === 'alta' ? () => setReadmitirId(patient.id) : undefined}
                        rodape={rodape}
                      />
                    );
                  })
                : (
                    <Box style={{ gridColumn: '1 / -1' }}>
                      <EmptyState
                        message={searchFilter
                          ? `Nenhum paciente encontrado para "${searchFilter}". Tente outro nome ou CPF.`
                          : aba === 'alta'
                            ? 'Nenhum paciente com alta. Quem recebe alta na esteira aparece aqui para ser readmitido.'
                            : 'Nenhum paciente ativo. Cadastre um paciente ou readmita alguém pela aba "Com alta".'}
                      />
                    </Box>
                  )}
          </SimpleGrid>
        )}

        {!isLoading && !loadError && totalPages > 1 && (
          <Group justify="center" mt="xl" mb="sm">
            <Pagination
              value={currentPage}
              onChange={setCurrentPage}
              total={totalPages}
              color="slate"
            />
          </Group>
        )}
      </ScrollArea>
    </PageShell>
  );
};
