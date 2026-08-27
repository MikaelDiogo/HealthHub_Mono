import { useEffect, useState } from 'react';
import {
  Text,
  Box,
  Group,
  Divider,
  Stack,
  Avatar,
  Center,
  ThemeIcon,
  Skeleton,
  Badge,
} from '@mantine/core';
import { ButtonLogOut, SideBarLink } from '../Buttons';
import {
  IconLayoutDashboard,
  IconUsers,
  IconWaveSawTool,
  IconAlertTriangle,
  IconLogout,
  IconCircleCheck,
  IconUserFilled,
  IconActivity,
  IconHeartbeat,
  IconFile,
  IconShieldLock,
} from '@tabler/icons-react';
import { useTermosAceitos } from '../TermosUsoModal';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABEL: Record<string, string> = {
  medico: 'Médico',
  enfermeiro: 'Enfermeiro',
  recepcionista: 'Recepcionista',
};

export default function SideBar() {
  const [patientCount, setPatientCount] = useState<number | null>(null);
  const { role, nome } = useAuth();
  const termosAceitos = useTermosAceitos();

  useEffect(() => {
    api
      .get('/patients')
      .then((res) => {
        if (Array.isArray(res.data)) setPatientCount(res.data.length);
      })
      .catch(() => {});
  }, []);

  const initials = nome
    ? nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : '?';

  return (
    <Box
      h="100%"
      py="md"
      px="sm"
      style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* ── Branding ── */}
      <Box px="xs" style={{ flexShrink: 0 }}>
        <Group gap="sm" mb="sm" align="center">
          <ThemeIcon color="teal" size={40} radius="md" variant="filled" style={{ flexShrink: 0 }}>
            <IconActivity size={20} stroke={2} />
          </ThemeIcon>
          <Stack gap={1}>
            <Text fw={600} size="lg" c="slate.9" lh={1.1}>
              HealthHub
            </Text>
            <Text fw={500} size="10px" tt="uppercase" c="slate.4" lts={1.2}>
              Sistemas Hospitalares
            </Text>
          </Stack>
        </Group>

        <Group
          gap={6}
          px="sm"
          py={6}
          style={{
            backgroundColor: 'var(--mantine-color-teal-0)',
            border: '1px solid var(--mantine-color-teal-2)',
            borderRadius: 8,
          }}
        >
          <IconCircleCheck size={12} color="var(--mantine-color-teal-6)" />
          <Text size="xs" fw={500} c="teal.7" style={{ flex: 1 }}>
            Sistema Online
          </Text>
          <Badge color="teal" size="xs" variant="dot">
            Ativo
          </Badge>
        </Group>
      </Box>

      <Divider my="sm" color="slate.1" mx="xs" />

      {/* ── Navegação ── */}
      <Box px="xs" style={{ flexShrink: 0 }}>
        <Text size="10px" fw={700} c="slate.4" tt="uppercase" lts={1.5} mb={6} pl={4}>
          Navegação
        </Text>
        <Stack gap={2}>
          {role !== 'recepcionista' && (
            <SideBarLink
              to="/main"
              label="Dashboard"
              textLabel="Visão Geral"
              icon={<IconLayoutDashboard size={18} stroke={2} />}
            />
          )}
          <SideBarLink
            to="/main/pacientes"
            label="Pacientes"
            textLabel={role === 'recepcionista' ? 'Cadastrar Pacientes' : 'Gerenciar Pacientes'}
            icon={<IconUsers size={18} stroke={2} />}
          />
          {role !== 'recepcionista' && (
            <SideBarLink
              to="/main/monitor"
              label="Monitoramento"
              textLabel="Sinais em Tempo Real"
              icon={<IconWaveSawTool size={18} stroke={2} />}
            />
          )}
          <SideBarLink
            to="/main/alertas"
            label="Esteira de Cuidado"
            textLabel="Triagem e Fluxo Clínico"
            icon={<IconAlertTriangle size={18} stroke={2} />}
          />
          {role !== 'recepcionista' && (
            <SideBarLink
              to="/main/exportar"
              label="Exportar Prontuário"
              textLabel="Gerar PDF do Paciente"
              icon={<IconFile size={18} stroke={2} />}
            />
          )}

          {/* Política de Dados — sempre visível, com badge "Novo" se ainda não aceitou */}
          <SideBarLink
            to="/main/politica"
            label="Política de Dados"
            textLabel="LGPD e Privacidade"
            icon={<IconShieldLock size={18} stroke={2} />}
            badge={!termosAceitos ? 'Novo' : undefined}
          />
        </Stack>
      </Box>

      <Divider my="sm" color="slate.1" mx="xs" />

      {/* ── Estatísticas Rápidas ── */}
      <Box px="xs" style={{ flexShrink: 0 }}>
        <Text size="10px" fw={600} c="slate.4" tt="uppercase" lts={1.2} mb={8} pl={2}>
          Estatísticas Rápidas
        </Text>
        <Stack gap={0}>
          <StatRow
            icon={<IconUserFilled size={11} />}
            color="blue"
            label="Pacientes"
            value={
              patientCount === null ? (
                <Skeleton w={20} h={13} radius="sm" />
              ) : (
                <Text size="xs" fw={700} c="slate.7">
                  {patientCount}
                </Text>
              )
            }
          />
          {role !== 'recepcionista' && (
            <>
              <Divider color="slate.1" />
              <StatRow
                icon={<IconActivity size={11} />}
                color="teal"
                label="Monitoramento"
                value={
                  <Badge color="teal" size="xs" variant="light" radius="sm">
                    Ativo
                  </Badge>
                }
              />
            </>
          )}
          <Divider color="slate.1" />
          <StatRow
            icon={<IconHeartbeat size={11} />}
            color="orange"
            label="Esteira de Cuidado"
            value={
              <Badge color="orange" size="xs" variant="light" radius="sm">
                Em Uso
              </Badge>
            }
          />
        </Stack>
      </Box>

      {/* ── Spacer ── */}
      <Box style={{ flex: 1 }} />

      {/* ── Usuário ── */}
      <Box
        px="xs"
        pt="sm"
        style={{ flexShrink: 0, borderTop: '1px solid var(--mantine-color-slate-2)' }}
      >
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Group gap={8} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            <Avatar color="blue" radius="md" size={34} style={{ flexShrink: 0 }}>
              {initials}
            </Avatar>
            <Stack gap={0} style={{ minWidth: 0 }}>
              <Text size="11px" fw={800} c="slate.9" tt="uppercase" truncate lh={1.1}>
                {nome ?? 'Usuário'}
              </Text>
              <Text size="10px" fw={600} c="slate.4" truncate>
                {role ? ROLE_LABEL[role] : ''}
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
                  borderRadius: 8,
                  border: '1px solid var(--mantine-color-slate-2)',
                  color: 'var(--mantine-color-slate-6)',
                  cursor: 'pointer',
                }}
              >
                <IconLogout size={16} stroke={2.5} />
              </Center>
            }
          />
        </Group>
      </Box>
    </Box>
  );
}

function StatRow({
  icon,
  color,
  label,
  value,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Group gap={8} py={8} px={2} justify="space-between" wrap="nowrap">
      <Group gap={7} wrap="nowrap" style={{ minWidth: 0 }}>
        <ThemeIcon color={color} size={20} radius="xl" variant="light" style={{ flexShrink: 0 }}>
          {icon}
        </ThemeIcon>
        <Text size="xs" fw={500} c="slate.6" truncate>
          {label}
        </Text>
      </Group>
      {value}
    </Group>
  );
}
