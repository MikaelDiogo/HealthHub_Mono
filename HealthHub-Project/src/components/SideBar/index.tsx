import { useEffect, useState } from 'react';
import { Text, Box, Group, Stack, Avatar, Center, Skeleton } from '@mantine/core';
import { ButtonLogOut, SideBarLink } from '../Buttons';
import {
  IconLayoutDashboard,
  IconUsers,
  IconWaveSawTool,
  IconAlertTriangle,
  IconLogout,
  IconFile,
  IconShieldLock,
  IconMessages,
} from '@tabler/icons-react';
import { useTermosAceitos } from '../TermosUsoModal';
import { useMediaQuery } from '@mantine/hooks';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCare } from '../../context/CareContext';
import { chatService } from '../../services/chatService';
import { roleLabel } from '../../utils/roles';
import { HHMark } from '../ui';

const ICON = { size: 16, stroke: 1.5 } as const;

export default function SideBar({ onNavClose }: { onNavClose?: () => void }) {
  const [pacientesAtivos, setPacientesAtivos] = useState<number | null>(null);
  const { role, nome } = useAuth();
  const { carePatients } = useCare();
  const isMobile = useMediaQuery('(max-width: 768px)') ?? false;
  const termosAceitos = useTermosAceitos();

  // Pacientes ativos = os mesmos que a tela "Pacientes" lista (quem recebeu alta não conta)
  useEffect(() => {
    const carregar = () =>
      api
        .get('/patients', { params: { ativo: true } })
        .then((res) => {
          if (Array.isArray(res.data)) setPacientesAtivos(res.data.length);
        })
        .catch(() => {});
    carregar();
    return chatService.onFilaChanged(carregar);
  }, []);

  const initials = nome
    ? nome
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '?';

  return (
    <Box
      h="100%"
      py="md"
      px="sm"
      style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* Marca e escopo: o produto sempre se nomeia */}
      <Group gap="sm" px="xs" mb="lg" wrap="nowrap" style={{ flexShrink: 0 }}>
        <HHMark size={32} />
        <Stack gap={0}>
          <Text fw={700} size="md" lh={1.2} c="var(--hh-ink)">HealthHub</Text>
          <Text size="xs" c="var(--hh-muted)">Triagem hospitalar</Text>
        </Stack>
      </Group>

      <Box px="xs" style={{ flexShrink: 0 }}>
        <Text size="xs" c="var(--hh-muted)" mb={6} pl={4}>Navegação</Text>
        <Stack gap={2}>
          {!isMobile && role !== 'recepcionista' && (
            <SideBarLink to="/main" label="Dashboard" textLabel="Visão geral dos pacientes" icon={<IconLayoutDashboard {...ICON} />} onClick={onNavClose} />
          )}
          <SideBarLink to="/main/pacientes" label="Pacientes" textLabel={role === 'recepcionista' ? 'Cadastrar pacientes' : 'Gerenciar pacientes'} icon={<IconUsers {...ICON} />} onClick={onNavClose} />
          {!isMobile && role !== 'recepcionista' && (
            <SideBarLink to="/main/monitor" label="Monitoramento" textLabel="Sinais em tempo real" icon={<IconWaveSawTool {...ICON} />} onClick={onNavClose} />
          )}
          <SideBarLink to="/main/alertas" label="Esteira de Cuidado" textLabel="Triagem e fluxo clínico" icon={<IconAlertTriangle {...ICON} />} onClick={onNavClose} />
          {!isMobile && role !== 'recepcionista' && (
            <SideBarLink to="/main/exportar" label="Exportar Prontuário" textLabel="Gerar PDF do paciente" icon={<IconFile {...ICON} />} onClick={onNavClose} />
          )}
          <SideBarLink to="/chat" label="Chat Interno" textLabel="Comunicação da equipe" icon={<IconMessages {...ICON} />} onClick={onNavClose} />
          {!isMobile && (
            <SideBarLink to="/main/politica" label="Política de Dados" textLabel="LGPD e privacidade" icon={<IconShieldLock {...ICON} />} badge={!termosAceitos ? 'Novo' : undefined} onClick={onNavClose} />
          )}
        </Stack>
      </Box>

      {/* Dois números reais, ao vivo — no lugar dos selos fixos "Online / Ativo / Em Uso" */}
      <Box px="xs" mt="lg" style={{ flexShrink: 0 }}>
        <Text size="xs" c="var(--hh-muted)" mb={6} pl={4}>Agora</Text>
        <Stack gap={0}>
          <KeyValue
            label="Pacientes ativos"
            value={pacientesAtivos === null ? <Skeleton w={20} h={16} /> : String(pacientesAtivos)}
          />
          <KeyValue label="Na esteira de cuidado" value={String(carePatients.length)} />
        </Stack>
      </Box>

      <Box style={{ flex: 1 }} />

      {/* Usuário */}
      <Box px="xs" pt="sm" style={{ flexShrink: 0, borderTop: '1px solid var(--hh-border)' }}>
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Group gap={10} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            <Avatar color="slate" variant="light" radius="md" size={32} style={{ flexShrink: 0 }}>
              {initials}
            </Avatar>
            <Stack gap={0} style={{ minWidth: 0 }}>
              <Text size="sm" fw={500} c="var(--hh-ink)" truncate lh={1.2}>
                {nome ?? 'Usuário'}
              </Text>
              <Text size="xs" c="var(--hh-muted)" truncate>
                {roleLabel(role)}
              </Text>
            </Stack>
          </Group>

          <ButtonLogOut
            to="/"
            label=""
            textLabel=""
            icon={
              <Center
                w={32}
                h={32}
                style={{
                  borderRadius: 'var(--hh-radius-control)',
                  border: '1px solid var(--hh-control)',
                  color: 'var(--hh-muted)',
                  cursor: 'pointer',
                }}
              >
                <IconLogout size={16} stroke={1.5} />
              </Center>
            }
          />
        </Group>
      </Box>
    </Box>
  );
}

function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Group gap={8} py={6} px={4} justify="space-between" wrap="nowrap">
      <Text size="sm" c="var(--hh-muted)" truncate>{label}</Text>
      <Text size="sm" fw={600} c="var(--hh-ink)" component="span">{value}</Text>
    </Group>
  );
}
