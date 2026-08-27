import { useState, useEffect, useRef } from 'react';
import {
  Grid,
  Paper,
  Select,
  Text,
  Group,
  Stack,
  Avatar,
  TextInput,
  Loader,
  ThemeIcon,
  Box,
  ScrollArea,
  ActionIcon,
  SimpleGrid,
  Badge,
} from '@mantine/core';
import {
  IconHeartRateMonitor,
  IconRobot,
  IconUser,
  IconSend,
  IconTemperature,
  IconDroplet,
  IconGauge,
  IconMicrophone,
  IconMicrophoneOff,
} from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import api from '../../services/api';
import { PageShell } from '../../components/PageShell';
import type { Patient } from '../../types/patient';

type RecordingState = 'idle' | 'recording' | 'transcribing';

interface Message {
  id: number;
  sender: 'user' | 'ai';
  text: string;
  time: string;
}

export const Monitoring = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiSummary, setAiSummary] = useState('Selecione um paciente para gerar o parecer clínico.');
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    api.get('/patients').then((r) => setPatients(Array.isArray(r.data) ? r.data : []));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sendingMessage]);

  const handlePatientChange = (value: string | null) => {
    setSelectedPatientId(value);
    if (!value) {
      setCurrentPatient(null);
      setAiSummary('Selecione um paciente para gerar o parecer clínico.');
      setMessages([]);
      return;
    }

    const patientData = patients.find((p) => p.id === value) ?? null;
    setCurrentPatient(patientData);
    const ultima = patientData?.sinaisVitais?.[0];

    setLoadingAI(true);
    setMessages([
      {
        id: 1,
        sender: 'ai',
        text: `Olá! Analisando **${patientData?.nome_completo}**. Como posso ajudar neste caso?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    setTimeout(() => {
      if (ultima) {
        setAiSummary(
          `**Parecer para ${patientData?.nome_completo}:**\n` +
            `SpO₂ ${ultima.saturacao_oxigenio ?? '--'}% · FC ${ultima.frequencia_cardiaca ?? '--'} bpm · ` +
            `Temp ${ultima.temperatura ?? '--'}°C · PA ${ultima.pressao_arterial ?? '--'}.`,
        );
      } else {
        setAiSummary('Sem leituras de triagem recentes. Registre sinais vitais na aba Pacientes.');
      }
      setLoadingAI(false);
    }, 600);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedPatientId || !currentPatient || sendingMessage) return;

    const texto = chatInput.trim();
    setChatInput('');
    setSendingMessage(true);

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: 'user', text: texto, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);

    try {
      const response = await api.post(`/patients/${selectedPatientId}/chat`, {
        message: texto,
        patientContext: {
          nome: currentPatient.nome_completo,
          alergias: currentPatient.alergias,
          medicamentos: currentPatient.medicamentos_em_uso,
          anamnese: currentPatient.anamnese,
          sinaisVitais: currentPatient.sinaisVitais?.[0],
        },
        history: messages.slice(-4).map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
      });

      if (response.data?.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'ai',
            text: response.data.reply,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 2, sender: 'ai', text: 'Erro ao conectar com o assistente.', time: '' },
      ]);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleToggleRecording = async () => {
    if (recordingState === 'recording') {
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecordingState('transcribing');

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', audioBlob, 'audio.webm');

          const { data } = await api.post(`/patients/${selectedPatientId}/chat/audio`, formData);

          if (data?.transcription) {
            setChatInput(data.transcription);
          }
        } catch {
          // silently fail — doctor can type manually
        } finally {
          setRecordingState('idle');
        }
      };

      mediaRecorder.start();
      setRecordingState('recording');
    } catch {
      setRecordingState('idle');
    }
  };

  const v = currentPatient?.sinaisVitais?.[0];
  const isRecording = recordingState === 'recording';
  const isTranscribing = recordingState === 'transcribing';
  const micDisabled = !selectedPatientId || sendingMessage || isTranscribing;

  return (
    <PageShell
      title="Monitoramento Clínico"
      description="Chat assistido por IA (Grok · Ollama)"
      icon={<IconHeartRateMonitor size={28} />}
      actions={
        <Select
          label="Paciente"
          placeholder="Selecionar..."
          data={patients.map((p) => ({ value: p.id, label: p.nome_completo }))}
          value={selectedPatientId}
          onChange={handlePatientChange}
          searchable
          w={300}
        />
      }
    >
      <Grid gutter="md" style={{ flex: 1, minHeight: 0, height: '100%' }}>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Stack gap="md">
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <ThemeIcon color="slate" size="md">
                    <IconRobot size={16} />
                  </ThemeIcon>
                  <Text fw={700} size="sm">
                    Análise de Evolução (IA)
                  </Text>
                </Group>
                {loadingAI && <Loader size="xs" type="dots" />}
              </Group>
              <ScrollArea mah={220}>
                <Text size="xs" c="slate.7" style={{ whiteSpace: 'pre-line' }}>
                  {aiSummary}
                </Text>
              </ScrollArea>
            </Paper>

            <Paper withBorder p="md" radius="md">
              <Text fw={700} size="sm" mb="sm">
                Última Leitura de Triagem
              </Text>
              <SimpleGrid cols={2} spacing="xs">
                {[
                  { label: 'Temperatura', value: v?.temperatura ? `${v.temperatura} °C` : '--', icon: IconTemperature },
                  { label: 'FC', value: v?.frequencia_cardiaca ? `${v.frequencia_cardiaca} bpm` : '--', icon: IconHeartRateMonitor },
                  { label: 'SpO₂', value: v?.saturacao_oxigenio ? `${v.saturacao_oxigenio}%` : '--', icon: IconDroplet },
                  { label: 'PA', value: v?.pressao_arterial ?? '--', icon: IconGauge },
                ].map(({ label, value, icon: Icon }) => (
                  <Paper key={label} p="xs" withBorder>
                    <Group gap="xs">
                      <Icon size={18} />
                      <Box>
                        <Text size="10px" c="dimmed">
                          {label}
                        </Text>
                        <Text fw={700} size="sm">
                          {value}
                        </Text>
                      </Box>
                    </Group>
                  </Paper>
                ))}
              </SimpleGrid>
            </Paper>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 7 }} style={{ display: 'flex', flexDirection: 'column' }}>
          <Paper withBorder radius="md" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 480, overflow: 'hidden' }}>
            <Box p="sm" bg="slate.9" c="white">
              <Group gap="sm">
                <Avatar radius="md" size="sm" color="gray">
                  <IconRobot size={18} />
                </Avatar>
                <Box>
                  <Text fw={700} size="sm">
                    Assistente de Caso Clínico
                  </Text>
                  <Text size="10px" c="slate.4">
                    Grok · Ollama
                  </Text>
                </Box>
              </Group>
            </Box>

            <ScrollArea h="calc(100dvh - 300px)" p="md" bg="slate.0">
              {messages.length === 0 ? (
                <Text size="xs" c="dimmed" ta="center" py="xl">
                  Selecione um paciente para iniciar o chat.
                </Text>
              ) : (
                <Stack gap="sm">
                  {messages.map((msg) => (
                    <Group
                      key={msg.id}
                      gap="xs"
                      align="flex-start"
                      style={{
                        maxWidth: '90%',
                        marginLeft: msg.sender === 'user' ? 'auto' : 0,
                        flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                      }}
                    >
                      <Avatar size="sm" radius="md" color="slate">
                        {msg.sender === 'user' ? <IconUser size={12} /> : <IconRobot size={12} />}
                      </Avatar>
                      <Paper
                        p="xs"
                        radius="md"
                        bg={msg.sender === 'user' ? 'slate.8' : 'white'}
                        c={msg.sender === 'user' ? 'white' : 'slate.8'}
                        withBorder={msg.sender === 'ai'}
                      >
                        <Box style={{ fontSize: 12 }}>
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </Box>
                        <Text size="9px" ta="right" mt={4} c={msg.sender === 'user' ? 'slate.4' : 'dimmed'}>
                          {msg.time}
                        </Text>
                      </Paper>
                    </Group>
                  ))}
                  {sendingMessage && <Loader size="xs" type="dots" />}
                  <div ref={messagesEndRef} />
                </Stack>
              )}
            </ScrollArea>

            {/* Indicador de estado de gravação */}
            {(isRecording || isTranscribing) && (
              <Group px="sm" py={4} gap="xs" bg={isRecording ? 'red.0' : 'blue.0'}>
                {isTranscribing
                  ? <Loader size={10} color="blue" />
                  : <Box w={8} h={8} bg="red" style={{ borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                }
                <Text size="xs" c={isRecording ? 'red.7' : 'blue.7'}>
                  {isRecording ? 'Gravando... clique no microfone para parar' : 'Transcrevendo áudio...'}
                </Text>
              </Group>
            )}

            <Group p="sm" style={{ borderTop: '1px solid var(--mantine-color-slate-2)' }}>
              {/* Botão de microfone */}
              <ActionIcon
                size="lg"
                color={isRecording ? 'red' : 'slate'}
                variant={isRecording ? 'filled' : 'light'}
                disabled={micDisabled}
                loading={isTranscribing}
                onClick={handleToggleRecording}
                title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
              >
                {isRecording ? <IconMicrophoneOff size={16} /> : <IconMicrophone size={16} />}
              </ActionIcon>

              <TextInput
                style={{ flex: 1 }}
                placeholder={
                  isRecording
                    ? 'Gravando...'
                    : isTranscribing
                    ? 'Transcrevendo...'
                    : selectedPatientId
                    ? 'Mensagem ou use o microfone...'
                    : 'Selecione um paciente...'
                }
                disabled={!selectedPatientId || sendingMessage || isRecording || isTranscribing}
                value={chatInput}
                onChange={(e) => setChatInput(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />

              <ActionIcon
                size="lg"
                color="slate"
                variant="filled"
                disabled={!selectedPatientId || sendingMessage || isRecording || isTranscribing}
                loading={sendingMessage}
                onClick={handleSendMessage}
              >
                <IconSend size={16} />
              </ActionIcon>
            </Group>
          </Paper>
        </Grid.Col>
      </Grid>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </PageShell>
  );
};
