import { Card, Text, Avatar, Button, Group, Box, SimpleGrid, ThemeIcon } from '@mantine/core';
import {
  IconHeartRateMonitor,
  IconActivity,
  IconEye,
  IconPencil,
  IconTemperature,
} from '@tabler/icons-react';

interface CardPatientProps {
  patientName: string;
  patientAge: number;
  patientGender: string;
  temp?: string;
  bpm?: string;
  spo2?: string;
  onView?: () => void;
  onClickView?: () => void;
  onEdit?: () => void;
}

function getInitials(name: string) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const CardPatient = ({
  patientName,
  patientAge,
  patientGender,
  onView,
  onClickView,
  onEdit,
  temp = '--',
  bpm = '--',
  spo2 = '--',
}: CardPatientProps) => {
  const handleViewAction = onView || onClickView;

  const vitals = [
    { label: temp, icon: IconTemperature },
    { label: bpm, icon: IconHeartRateMonitor },
    { label: spo2, icon: IconActivity },
  ];

  return (
    <Card
      radius="md"
      p={0}
      h="100%"
      style={{
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid oklch(0.90 0.01 220)',
        backgroundColor: '#fff',
      }}
    >
      {/* Gradient top bar */}
      <Box
        style={{
          height: 5,
          background: 'linear-gradient(135deg, oklch(0.62 0.13 200), oklch(0.52 0.14 240))',
        }}
      />

      <Box
        p="lg"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 20 }}
      >
        <Box>
          <Group mb="md" wrap="nowrap">
            <Avatar size={48} radius="md" color="slate" variant="light">
              {getInitials(patientName)}
            </Avatar>
            <Box style={{ minWidth: 0 }}>
              <Text fw={700} size="lg" c="slate.7" truncate>
                {patientName}
              </Text>
              <Text size="xs" c="slate.5">
                {patientAge} anos · {patientGender}
              </Text>
            </Box>
          </Group>

          <SimpleGrid cols={3} spacing="xs">
            {vitals.map(({ label, icon: Icon }) => (
              <Box
                key={label}
                p="sm"
                style={{
                  textAlign: 'center',
                  borderRadius: 12,
                  backgroundColor: 'var(--mantine-color-slate-0)',
                  border: '1px solid oklch(0.90 0.01 220)',
                }}
              >
                <ThemeIcon size="sm" radius="md" color="slate" variant="light" mx="auto" mb={6}>
                  <Icon size={16} />
                </ThemeIcon>
                <Text fw={700} size="sm" c="slate.7" truncate>
                  {label}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>

        <Group grow pt="sm" style={{ borderTop: '1px solid oklch(0.90 0.01 220)' }}>
          <Button
            variant="outline"
            color="slate"
            size="sm"
            leftSection={<IconEye size={16} />}
            onClick={handleViewAction}
          >
            Visualizar
          </Button>
          <Button
            color="slate"
            size="sm"
            leftSection={<IconPencil size={16} />}
            onClick={onEdit}
          >
            Editar
          </Button>
        </Group>
      </Box>
    </Card>
  );
};

export default CardPatient;
