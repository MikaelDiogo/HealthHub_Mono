import { Paper, Text, Avatar, Button, Group, Box } from '@mantine/core';

interface CardPatientProps {
  patientName: string;
  patientAge: number;
  patientGender: string;
  temp?: string;
  bpm?: string;
  spo2?: string;
  /** Cor da faixa superior — a cor da classificação de risco (riscoCSSColor) */
  topColor?: string;
  onView?: () => void;
  onClickView?: () => void;
  onEdit?: () => void;
  /** Paciente com alta: troca "Editar" por "Readmitir" */
  onReadmit?: () => void;
  /** Linha de contexto abaixo dos sinais (ex.: "Alta há 3 dias · 2 visitas") */
  rodape?: string;
}

function getInitials(name: string) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

const AUSENTE = '--';

// Cartão de paciente: a faixa superior é a categoria de risco (dado). Os sinais
// vitais levam rótulo em texto (antes só havia ícone) e valor ausente vira traço cinza.
const CardPatient = ({
  patientName, patientAge, patientGender,
  onView, onClickView, onEdit, onReadmit, rodape,
  temp = AUSENTE, bpm = AUSENTE, spo2 = AUSENTE,
  topColor = 'var(--hh-control)',
}: CardPatientProps) => {
  const handleViewAction = onView || onClickView;

  const vitals = [
    { rotulo: 'Temp.', valor: temp },
    { rotulo: 'FC', valor: bpm },
    { rotulo: 'SpO₂', valor: spo2 },
  ];

  return (
    <Paper withBorder p={0} h="100%" className="hh-interactive" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box style={{ height: 3, backgroundColor: topColor }} />

      <Box p="md" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
        <Box>
          <Group mb="md" wrap="nowrap">
            <Avatar size={36} radius="md" color="slate" variant="light">
              {getInitials(patientName)}
            </Avatar>
            <Box style={{ minWidth: 0 }}>
              <Text fw={600} size="sm" c="var(--hh-ink)" truncate>{patientName}</Text>
              <Text size="xs" c="var(--hh-muted)">
                {patientAge} anos · {patientGender}
              </Text>
            </Box>
          </Group>

          <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {vitals.map(({ rotulo, valor }) => (
              <Box key={rotulo}>
                <Text size="xs" c="var(--hh-muted)">{rotulo}</Text>
                <Text size="sm" fw={600} c={valor === AUSENTE ? 'var(--hh-faint)' : 'var(--hh-ink)'} truncate>
                  {valor === AUSENTE ? '—' : valor}
                </Text>
              </Box>
            ))}
          </Box>
          {rodape && (
            <Text size="xs" c="var(--hh-faint)" mt="sm" truncate>{rodape}</Text>
          )}
        </Box>

        <Group grow pt="sm" style={{ borderTop: '1px solid var(--hh-rule)' }}>
          <Button variant="default" size="xs" onClick={handleViewAction}>
            Visualizar
          </Button>
          {onReadmit ? (
            <Button size="xs" onClick={onReadmit}>
              Readmitir
            </Button>
          ) : onEdit ? (
            <Button variant="default" size="xs" onClick={onEdit}>
              Editar
            </Button>
          ) : null}
        </Group>
      </Box>
    </Paper>
  );
};

export default CardPatient;
