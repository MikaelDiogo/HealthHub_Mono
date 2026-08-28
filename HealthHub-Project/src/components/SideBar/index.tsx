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

function HHLogo({ size = 36 }: { size?: number }) {
  const bar = Math.round(size * 0.43);
  const thick = Math.round(size * 0.13);
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.26),
        background: 'linear-gradient(155deg, oklch(0.62 0.13 200), oklch(0.52 0.14 240))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: bar,
          height: thick,
          borderRadius: thick / 2,
          background: '#fff',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: thick,
          height: bar,
          borderRadius: thick / 2,
          background: '#fff',
        }}
      />
    </div>
  );
}

export default function SideBar({ onNavClose }: { onNavClose?: () => void }) {
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
      {/* ── Branding ── */}
      <Box px="xs" style={{ flexShrink: 0 }}>
        <Group gap="sm" mb="sm" align="center">
          <HHLogo size={40} />
          <Stack gap={1}>
            <Text lh={1.1} style={{ fontSize: 18, lineHeight: 1.1 }}>
              <span style={{ fontWeight: 400, color: 'oklch(0.24 0.02 240)' }}>Health</span>
              <span style={{ fontWeight: 800, color: 'oklch(0.52 0.14 235)' }}>Hub</span>
            </Text>
            <Text
              size="10px"
              tt="uppercase"
              lts={1.2}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                color: 'oklch(0.60 0.02 240)',
                letterSpacing: '0.08em',
              }}
            >
              Sistemas Hospitalares
            </Text>
          </Stack>
        </Group>

        <Group
          gap={6}
          px="sm"
          py={6}
          style={{
            backgroundColor: 'oklch(0.97 0.02 235)',
            border: '1px solid oklch(0.88 0.05 235)',
            borderRadius: 8,
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: 'oklch(0.62 0.19 145)',
              flexShrink: 0,
            }}
          />
          <Text
            size="xs"
            fw={500}
            c="slate.7"
            style={{ flex: 1 }}
          >
            Sistema Online
          </Text>
          <Text
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              color: 'oklch(0.52 0.14 235)',
              fontWeight: 600,
            }}
          >
            Online
          </Text>
        </Group>
      </Box>

      <Divider my="sm" color="oklch(0.92 0.01 220)" mx="xs" />

      {/* ── Navegação ── */}
      <Box px="xs" style={{ flexShrink: 0 }}>
        <Text
          size="10px"
          fw={700}
          tt="uppercase"
          mb={6}
          pl={4}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            color: 'oklch(0.60 0.02 240)',
            letterSpacing: '0.12em',
          }}
        >
          Navegação
        </Text>
        <Stack gap={2}>
          {role !== 'recepcionista' && (
            <SideBarLink to="/main" label="Dashboard" textLabel="Visão Geral" icon={<IconLayoutDashboard size={18} stroke={2} />} onClick={onNavClose} />
          )}
          <SideBarLink to="/main/pacientes" label="Pacientes" textLabel={role === 'recepcionista' ? 'Cadastrar Pacientes' : 'Gerenciar Pacientes'} icon={<IconUsers size={18} stroke={2} />} onClick={onNavClose} />
          {role !== 'recepcionista' && (
            <SideBarLink to="/main/monitor" label="Monitoramento" textLabel="Sinais em Tempo Real" icon={<IconWaveSawTool size={18} stroke={2} />} onClick={onNavClose} />
          )}
          <SideBarLink to="/main/alertas" label="Esteira de Cuidado" textLabel="Triagem e Fluxo Clínico" icon={<IconAlertTriangle size={18} stroke={2} />} onClick={onNavClose} />
          {role !== 'recepcionista' && (
            <SideBarLink to="/main/exportar" label="Exportar Prontuário" textLabel="Gerar PDF do Paciente" icon={<IconFile size={18} stroke={2} />} onClick={onNavClose} />
          )}
          <SideBarLink to="/main/politica" label="Política de Dados" textLabel="LGPD e Privacidade" icon={<IconShieldLock size={18} stroke={2} />} badge={!termosAceitos ? 'Novo' : undefined} onClick={onNavClose} />
        </Stack>
      </Box>

      <Divider my="sm" color="oklch(0.92 0.01 220)" mx="xs" />

      {/* ── Estatísticas Rápidas ── */}
      <Box px="xs" style={{ flexShrink: 0 }}>
        <Text
          size="10px"
          fw={700}
          tt="uppercase"
          mb={8}
          pl={2}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            color: 'oklch(0.60 0.02 240)',
            letterSpacing: '0.12em',
          }}
        >
          Estatísticas
        </Text>
        <Stack gap={0}>
          <StatRow
            icon={<IconUserFilled size={11} />}
            color="slate"
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
              <Divider color="oklch(0.92 0.01 220)" />
              <StatRow
                icon={<IconActivity size={11} />}
                color="slate"
                label="Monitoramento"
                value={
                  <Badge color="slate" size="xs" variant="light" radius="sm">
                    Ativo
                  </Badge>
                }
              />
            </>
          )}
          <Divider color="oklch(0.92 0.01 220)" />
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
        style={{ flexShrink: 0, borderTop: '1px solid oklch(0.92 0.01 220)' }}
      >
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Group gap={8} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            <Avatar color="slate" radius="md" size={34} style={{ flexShrink: 0 }}>
              {initials}
            </Avatar>
            <Stack gap={0} style={{ minWidth: 0 }}>
              <Text size="11px" fw={800} c="slate.9" tt="uppercase" truncate lh={1.1}>
                {nome ?? 'Usuário'}
              </Text>
              <Text
                size="10px"
                truncate
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: 'oklch(0.60 0.02 240)',
                }}
              >
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
                  border: '1px solid oklch(0.92 0.01 220)',
                  color: 'oklch(0.55 0.04 240)',
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
