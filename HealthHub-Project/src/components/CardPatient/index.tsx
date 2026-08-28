import { Card, Text, Avatar, Button, Group, Box, SimpleGrid, ThemeIcon } from '@mantine/core';
import { IconHeartRateMonitor, IconActivity, IconEye, IconPencil, IconTemperature } from '@tabler/icons-react';
interface CardPatientProps {
  patientName: string;
  patientAge: number;
  patientGender: string;
  temp?: string;
  bpm?: string;
  spo2?: string;
  /** Cor da barra superior — deve ser a cor Manchester da triagem (manchesterCSSColor) */
  topColor?: string;
  onView?: () => void;
  onClickView?: () => void;
  onEdit?: () => void;
}

function getInitials(name: string) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

const CardPatient = ({
  patientName, patientAge, patientGender,
  onView, onClickView, onEdit,
  temp = '--', bpm = '--', spo2 = '--',
  topColor = 'var(--mantine-color-slate-3)',
}: CardPatientProps) => {
  const handleViewAction = onView || onClickView;

  const vitals = [
    { label: temp, icon: IconTemperature },
    { label: bpm,  icon: IconHeartRateMonitor },
    { label: spo2, icon: IconActivity },
  ];

  return (
    <Card radius="md" p={0} h="100%" style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--mantine-color-slate-2)' }}>
      {/* Barra de status — mesma cor da bolinha no gráfico */}
      <Box style={{ height: 4, backgroundColor: topColor }} />

      <Box p="md" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
        <Box>
          <Group mb="sm" wrap="nowrap">
            <Avatar size={40} radius="md" color="slate" variant="light">
              {getInitials(patientName)}
            </Avatar>
            <Box style={{ minWidth: 0 }}>
              <Text fw={700} size="sm" c="slate.8" truncate>{patientName}</Text>
              <Text size="xs" c="slate.5">
                {patientAge} anos · {patientGender}
              </Text>
            </Box>
          </Group>

          <SimpleGrid cols={3} spacing="xs">
            {vitals.map(({ label, icon: Icon }) => (
              <Box
                key={label}
                p="xs"
                style={{
                  textAlign: 'center',
                  borderRadius: 8,
                  backgroundColor: 'var(--mantine-color-slate-0)',
                  border: '1px solid var(--mantine-color-slate-2)',
                }}
              >
                <ThemeIcon size="sm" radius="sm" color="slate" variant="light" mx="auto" mb={4}>
                  <Icon size={13} />
                </ThemeIcon>
                <Text fw={600} size="xs" c="slate.7" truncate>{label}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>

        <Group grow pt="sm" style={{ borderTop: '1px solid var(--mantine-color-slate-1)' }}>
          <Button variant="subtle" color="slate" size="xs" leftSection={<IconEye size={13} />} onClick={handleViewAction}>
            Visualizar
          </Button>
          <Button variant="filled" color="slate" size="xs" leftSection={<IconPencil size={13} />} onClick={onEdit}>
            Editar
          </Button>
        </Group>
      </Box>
    </Card>
  );
};

export default CardPatient;
