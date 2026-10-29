import { useState, useEffect, useRef } from 'react';
import {
  Grid, Paper, Select, Text, Group, Stack, Avatar,
  TextInput, Loader, ThemeIcon, Box, ScrollArea,
  ActionIcon, SimpleGrid, Badge,
} from '@mantine/core';
import {
  IconHeartRateMonitor, IconRobot, IconUser, IconSend,
  IconTemperature, IconDroplet, IconGauge,
  IconMicrophone, IconMicrophoneOff,
} from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import api from '../../services/api';
import { PageShell } from '../../components/PageShell';
import type { Patient } from '../../types/patient';
import { chatService } from '../../services/chatService';
import { parseAiReply } from '../../utils/aiResponse';

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

  const loadPatients = () => {
    // Pacientes que já receberam alta somem daqui — voltam ao readmitir na esteira
    api.get('/patients', { params: { ativo: true } })
      .then((r) => setPatients(Array.isArray(r.data) ? r.data : []));
  };

  useEffect(loadPatients, []);

  // Alta/readmissão em outra sessão muda quem aparece aqui — mantém sincronizado
  useEffect(() => chatService.onFilaChanged(loadPatients), []);

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
    setMessages([{
      id: 1, sender: 'ai',
      text: `Olá! Analisando **${patientData?.nome_completo}**. Como posso ajudar neste caso?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
    setTimeout(() => {
      if (ultima) {
        setAiSummary(
          `Parecer para ${patientData?.nome_completo}:\n` +
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
      const parsed = parseAiReply(response.data);
      setMessages((prev) => [...prev, {
        id: Date.now() + 1, sender: 'ai', text: parsed.ok ? parsed.reply : parsed.error,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch {
      setMessages((prev) => [...prev, { id: Date.now() + 2, sender: 'ai', text: 'Erro ao conectar com o assistente.', time: '' }]);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleToggleRecording = async () => {
    if (recordingState === 'recording') { mediaRecorderRef.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecordingState('transcribing');
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', audioBlob, 'audio.webm');
          const { data } = await api.post(`/patients/${selectedPatientId}/chat/audio`, formData);
          if (data?.transcription) setChatInput(data.transcription);
        } catch { } finally { setRecordingState('idle'); }
      };
      mediaRecorder.start();
      setRecordingState('recording');
    } catch { setRecordingState('idle'); }
  };

  const v = currentPatient?.sinaisVitais?.[0];
  const isRecording = recordingState === 'recording';
  const isTranscribing = recordingState === 'transcribing';
  const micDisabled = !selectedPatientId || sendingMessage || isTranscribing;

  return (
    <PageShell
      title="Monitoramento Clínico"
      description="Chat assistido por IA · Análise de sinais vitais em tempo real"
      icon={<IconHeartRateMonitor size={24} />}
      actions={
        <Select
          label="Paciente"
          placeholder="Selecionar..."
          data={patients.map((p) => ({ value: p.id, label: p.nome_completo }))}
          value={selectedPatientId}
          onChange={handlePatientChange}
          searchable
          w={300}
          radius="md"
        />
      }
    >
      <Grid gutter="md" style={{ flex: 1, minHeight: 0, height: '100%' }}>

        {/* ── Painel esquerdo: IA + Vitais ── */}
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Stack gap="md">

            {/* Análise IA */}
            <Paper radius="md" style={{ border: '1px solid oklch(0.90 0.01 220)', overflow: 'hidden' }}>
              <Box
                p="sm"
                style={{ background: 'oklch(0.24 0.02 240)', borderBottom: '3px solid oklch(0.30 0.02 240)' }}
              >
                <Group justify="space-between">
                  <Group gap="xs">
                    <ThemeIcon color="gray" size="sm" radius="md" variant="light">
                      <IconRobot size={14} />
                    </ThemeIcon>
                    <Text fw={700} size="sm" c="white" style={{ fontFamily: "'Manrope', sans-serif" }}>Análise de Evolução (IA)</Text>
                  </Group>
                  {loadingAI && <Loader size="xs" type="dots" color="gray" />}
                </Group>
              </Box>
              <Box p="md">
                <ScrollArea mah={200}>
                  <Text size="xs" c="slate.7" style={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                    {aiSummary}
                  </Text>
                </ScrollArea>
              </Box>
            </Paper>

            {/* Última leitura de vitais */}
            <Paper radius="md" style={{ border: '1px solid oklch(0.90 0.01 220)', overflow: 'hidden' }}>
              <Box p="sm" style={{ borderBottom: '1px solid oklch(0.90 0.01 220)', background: 'oklch(0.24 0.02 240)' }}>
                <Text fw={700} size="sm" c="white" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Última Leitura de Triagem
                </Text>
              </Box>
              <Box p="md">
                <SimpleGrid cols={2} spacing="xs">
                  {[
                    { label: 'Temperatura', value: v?.temperatura ? `${v.temperatura} °C` : '--', icon: IconTemperature },
                    { label: 'FC', value: v?.frequencia_cardiaca ? `${v.frequencia_cardiaca} bpm` : '--', icon: IconHeartRateMonitor },
                    { label: 'SpO₂', value: v?.saturacao_oxigenio ? `${v.saturacao_oxigenio}%` : '--', icon: IconDroplet },
                    { label: 'PA', value: v?.pressao_arterial ?? '--', icon: IconGauge },
                  ].map(({ label, value, icon: Icon }) => (
                    <Paper
                      key={label}
                      p="sm"
                      radius="md"
                      style={{ border: '1px solid oklch(0.90 0.01 220)', background: 'var(--mantine-color-slate-0)' }}
                    >
                      <Group gap="xs">
                        <Icon size={16} color="oklch(0.60 0.03 230)" />
                        <Box>
                          <Text size="10px" c="dimmed" style={{ fontFamily: "'Manrope', sans-serif" }}>{label}</Text>
                          <Text fw={700} size="sm" c="slate.8">{value}</Text>
                        </Box>
                      </Group>
                    </Paper>
                  ))}
                </SimpleGrid>
              </Box>
            </Paper>

          </Stack>
        </Grid.Col>

        {/* ── Painel direito: Chat ── */}
        <Grid.Col span={{ base: 12, lg: 7 }} style={{ display: 'flex', flexDirection: 'column' }}>
          <Paper
            radius="md"
            style={{
              display: 'flex', flexDirection: 'column', flex: 1,
              minHeight: 480, overflow: 'hidden',
              border: '1px solid oklch(0.90 0.01 220)',
            }}
          >
            {/* Header do chat */}
            <Box p="sm" style={{ background: 'oklch(0.24 0.02 240)', borderBottom: '3px solid oklch(0.30 0.02 240)' }}>
              <Group gap="sm">
                <Avatar radius="md" size="sm" color="gray" variant="light">
                  <IconRobot size={16} />
                </Avatar>
                <Box>
                  <Text fw={700} size="sm" c="white" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    Assistente de Caso Clínico
                  </Text>
                  <Text size="10px" style={{ fontFamily: "'Manrope', sans-serif", color: 'oklch(0.65 0.03 230)' }}>
                    IA · Análise Clínica
                  </Text>
                </Box>
                {selectedPatientId && (
                  <Badge size="xs" color="slate" variant="light" radius="sm" ml="auto">
                    {currentPatient?.nome_completo?.split(' ')[0]}
                  </Badge>
                )}
              </Group>
            </Box>

            {/* Mensagens */}
            <ScrollArea h="calc(100dvh - 300px)" p="md" bg="slate.0">
              {messages.length === 0 ? (
                <Stack align="center" gap="xs" py="xl">
                  <ThemeIcon size={48} radius="xl" color="slate" variant="light">
                    <IconRobot size={24} />
                  </ThemeIcon>
                  <Text size="xs" c="dimmed" ta="center">
                    Selecione um paciente para iniciar o chat.
                  </Text>
                </Stack>
              ) : (
                <Stack gap="sm">
                  {messages.map((msg) => (
                    <Group
                      key={msg.id}
                      gap="xs"
                      align="flex-start"
                      style={{
                        maxWidth: '88%',
                        marginLeft: msg.sender === 'user' ? 'auto' : 0,
                        flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                      }}
                    >
                      <Avatar
                        size="sm"
                        radius="md"
                        color={msg.sender === 'user' ? 'hub' : 'gray'}
                        variant={msg.sender === 'user' ? 'filled' : 'light'}
                      >
                        {msg.sender === 'user' ? <IconUser size={12} /> : <IconRobot size={12} />}
                      </Avatar>
                      <Paper
                        p="xs"
                        radius="md"
                        style={{
                          background: msg.sender === 'user' ? 'oklch(0.52 0.14 235)' : '#fff',
                          color: msg.sender === 'user' ? '#fff' : 'oklch(0.24 0.02 240)',
                          border: msg.sender === 'ai' ? '1px solid oklch(0.90 0.01 220)' : 'none',
                        }}
                      >
                        <Box style={{ fontSize: 12 }}>
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </Box>
                        {msg.time && (
                          <Text size="9px" ta="right" mt={4} style={{ opacity: 0.6 }}>
                            {msg.time}
                          </Text>
                        )}
                      </Paper>
                    </Group>
                  ))}
                  {sendingMessage && (
                    <Group gap="xs" align="center">
                      <Avatar size="sm" radius="md" color="gray" variant="light"><IconRobot size={12} /></Avatar>
                      <Loader size="xs" type="dots" color="slate" />
                    </Group>
                  )}
                  <div ref={messagesEndRef} />
                </Stack>
              )}
            </ScrollArea>

            {/* Indicador de gravação */}
            {(isRecording || isTranscribing) && (
              <Group
                px="sm"
                py={6}
                gap="xs"
                style={{ background: isRecording ? 'oklch(0.97 0.05 25)' : 'oklch(0.97 0.02 235)', borderTop: '1px solid oklch(0.92 0.01 220)' }}
              >
                {isTranscribing
                  ? <Loader size={10} color="slate" />
                  : <Box w={8} h={8} bg="red" style={{ borderRadius: '50%', animation: 'pulse 1s infinite', flexShrink: 0 }} />
                }
                <Text size="xs" c={isRecording ? 'red.7' : 'hub.6'}>
                  {isRecording ? 'Gravando... clique no microfone para parar' : 'Transcrevendo áudio...'}
                </Text>
              </Group>
            )}

            {/* Input do chat */}
            <Group
              p="sm"
              gap="xs"
              style={{ borderTop: '1px solid oklch(0.90 0.01 220)', background: '#fff' }}
            >
              <ActionIcon
                size="lg"
                color={isRecording ? 'red' : 'hub'}
                variant={isRecording ? 'filled' : 'light'}
                radius="md"
                disabled={micDisabled}
                loading={isTranscribing}
                onClick={handleToggleRecording}
                title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
              >
                {isRecording ? <IconMicrophoneOff size={16} /> : <IconMicrophone size={16} />}
              </ActionIcon>

              <TextInput
                style={{ flex: 1 }}
                radius="md"
                placeholder={
                  isRecording ? 'Gravando...'
                    : isTranscribing ? 'Transcrevendo...'
                    : selectedPatientId ? 'Mensagem ou use o microfone...'
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
                radius="md"
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
