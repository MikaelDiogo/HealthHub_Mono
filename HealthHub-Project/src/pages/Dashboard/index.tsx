import { useEffect, useState, useCallback } from 'react';
import {
  Text, Box, Paper, Stack, ScrollArea, Center, Loader,
  Flex, Group, Title, TextInput, Pagination,
} from '@mantine/core';
import { CardDashboard } from '../../components/CardDashboard';
import { HistoryChart } from '../../components/GraphVital';
import api from '../../services/api';
import { PatientSidebarCard } from '../../components/PatientSideBarCard';
import { IconUsers, IconSearch } from '@tabler/icons-react';
import { PageShell } from '../../components/PageShell';
import type { Patient } from '../../types/patient';
import { useCare } from '../../context/CareContext';
import { manchesterCSSColor } from '../../utils/vitalStatus';

const SIDEBAR_PAGE_SIZE = 6;

export default function DashboardHome() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [sidebarPage, setSidebarPage] = useState(1);
  const [graphRefreshKey, setGraphRefreshKey] = useState(0);
  const { carePatients } = useCare();

  const loadPatients = useCallback(async () => {
    try {
      const response = await api.get('/patients');
      const data = response.data as Patient[];
      setPatients(data);
      // Atualiza o paciente selecionado com dados frescos
      if (selectedPatient) {
        const fresh = data.find(p => p.id === selectedPatient.id);
        if (fresh) setSelectedPatient(fresh);
      } else if (data.length > 0) {
        setSelectedPatient(data[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  // Escuta evento global de sinais vitais salvos → refaz fetch + atualiza gráfico
  useEffect(() => {
    const handler = () => {
      loadPatients();
      setGraphRefreshKey(k => k + 1);
    };
    window.addEventListener('vitals-updated', handler);
    return () => window.removeEventListener('vitals-updated', handler);
  }, [loadPatients]);

  const filteredSidebarPatients = patients.filter(
    (p) =>
      p.nome_completo.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      p.cpf?.includes(sidebarSearch),
  );

  const sidebarTotalPages = Math.ceil(filteredSidebarPatients.length / SIDEBAR_PAGE_SIZE);
  const paginatedSidebarPatients = filteredSidebarPatients.slice(
    (sidebarPage - 1) * SIDEBAR_PAGE_SIZE,
    sidebarPage * SIDEBAR_PAGE_SIZE,
  );

  function handleSidebarSearch(value: string) {
    setSidebarSearch(value);
    setSidebarPage(1);
  }

  if (loading) {
    return (
      <Center h="100%">
        <Stack align="center" gap="xs">
          <Loader color="slate" size="md" type="dots" />
          <Text size="xs" c="slate.5">Carregando painel central...</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <PageShell
      title="Painel de Monitoramento"
      description={
        <>
          Paciente em foco:{' '}
          <Text span fw={600} c="slate.8" inherit>
            {selectedPatient?.nome_completo || 'Nenhum selecionado'}
          </Text>
        </>
      }
    >
      <Box style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 'var(--mantine-spacing-md)' }}>
        <Box style={{ flexShrink: 0 }}>
          <CardDashboard patient={selectedPatient} />
        </Box>

        <Flex align="stretch" gap="md" style={{ flex: 1, minHeight: 0 }} direction={{ base: 'column', lg: 'row' }}>
          <Box style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <HistoryChart
              patientId={selectedPatient?.id ?? ''}
              patientName={selectedPatient?.nome_completo ?? ''}
              refreshKey={graphRefreshKey}
            />
          </Box>

          <Box w={{ base: '100%', lg: 300 }} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <Paper p="sm" radius="md" withBorder style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid var(--mantine-color-slate-2)' }}>
              <Group gap="xs" mb="xs">
                <IconUsers size={14} color="var(--mantine-color-slate-5)" />
                <Title order={6} c="slate.5" tt="uppercase" size="10px" style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.1em' }}>
                  Pacientes Disponíveis
                </Title>
              </Group>

              <TextInput
                placeholder="Nome ou CPF..."
                leftSection={<IconSearch size={12} />}
                value={sidebarSearch}
                onChange={(e) => handleSidebarSearch(e.currentTarget.value)}
                mb="xs"
              />

              <ScrollArea style={{ flex: 1 }} type="hover" offsetScrollbars>
                <Stack gap="xs" pr="xs">
                  {paginatedSidebarPatients.length > 0 ? (
                    paginatedSidebarPatients.map((p) => (
                      <PatientSidebarCard
                        key={p.id}
                        patient={p}
                        isActive={selectedPatient?.id === p.id}
                        onClick={() => setSelectedPatient(p)}
                        dotColor={manchesterCSSColor(
                          carePatients.find(c => c.paciente_id === p.id)?.gravidade
                        )}
                      />
                    ))
                  ) : (
                    <Text size="xs" c="slate.4" ta="center" py="md">
                      Nenhum paciente encontrado
                    </Text>
                  )}
                </Stack>
              </ScrollArea>

              {sidebarTotalPages > 1 && (
                <Pagination
                  mt="xs"
                  value={sidebarPage}
                  onChange={setSidebarPage}
                  total={sidebarTotalPages}
                  size="xs"
                  radius="md"
                  color="slate"
                />
              )}
            </Paper>
          </Box>
        </Flex>
      </Box>
    </PageShell>
  );
}
