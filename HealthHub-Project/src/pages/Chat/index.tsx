import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Text, Group, Stack, TextInput, ScrollArea, Avatar,
  Badge, ActionIcon, Paper, Tooltip, UnstyledButton,
  ThemeIcon, Divider, Indicator, Button,
} from '@mantine/core';
import {
  IconSearch, IconSend, IconAlertTriangle, IconUsers,
  IconUser, IconMessageCircle, IconCircleFilled, IconArrowLeft,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  chatService,
  type Conversation, type ChatMessage, type Contact, type Priority, type RoleChat,
} from '../../services/chatService';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ROLE_COLOR: Record<RoleChat, string> = {
  medico: 'blue',
  enfermeiro: 'green',
  recepcionista: 'orange',
};

const ROLE_LABEL: Record<RoleChat, string> = {
  medico: 'Médico',
  enfermeiro: 'Enfermeiro',
  recepcionista: 'Recepcionista',
};

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function formatTime(date: Date) {
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min`;
  if (diffMin < 1440) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// Mapeia role do AuthContext para o role do chatService
function mapRole(role: string | null): RoleChat {
  if (role === 'medico' || role === 'enfermeiro' || role === 'recepcionista') return role;
  return 'enfermeiro';
}

// Retorna um Contact "eu" usando o ID real do JWT
function buildMeContact(nome: string | null, role: string | null): Contact {
  const roleChat = mapRole(role);
  const realId = chatService.getMyId();
  return { id: realId || `user-${roleChat}`, name: nome ?? 'Você', role: roleChat, online: true };
}

// ─── Item da lista de conversas ───────────────────────────────────────────────
function ConversationItem({
  conv, isActive, me, onClick,
}: {
  conv: Conversation; isActive: boolean; me: Contact; onClick: () => void;
}) {
  const other = conv.type === 'direct'
    ? conv.participants.find(p => p.id !== me.id)
    : null;

  return (
    <UnstyledButton
      w="100%"
      px="sm"
      py={10}
      onClick={onClick}
      style={{
        borderRadius: 10,
        backgroundColor: isActive ? 'var(--mantine-color-slate-8)' : 'transparent',
        transition: 'background 120ms ease',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--mantine-color-slate-0)'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      <Group gap="sm" wrap="nowrap">
        {/* Avatar */}
        {conv.type === 'group' ? (
          <ThemeIcon size={40} radius="md" variant={isActive ? 'light' : 'filled'}
            color={isActive ? 'gray' : 'slate'} style={{ flexShrink: 0 }}>
            <IconUsers size={20} />
          </ThemeIcon>
        ) : (
          <Indicator
            disabled={!other?.online}
            color="green"
            size={9}
            offset={3}
            position="bottom-end"
            style={{ flexShrink: 0 }}
          >
            <Avatar size={40} radius="md" color={other ? ROLE_COLOR[other.role] : 'slate'}
              variant={isActive ? 'light' : 'filled'}
              style={{ fontSize: 14, fontWeight: 700 }}>
              {getInitials(other?.name ?? '?')}
            </Avatar>
          </Indicator>
        )}

        {/* Info */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" wrap="nowrap" gap={4}>
            <Text size="sm" fw={700} truncate
              style={{ color: isActive ? '#fff' : 'var(--mantine-color-slate-8)' }}>
              {conv.name}
            </Text>
            {conv.lastMessage && (
              <Text size="10px" style={{ fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0,
                color: isActive ? 'rgba(255,255,255,0.55)' : 'var(--mantine-color-slate-4)' }}>
                {formatTime(conv.lastMessage.timestamp)}
              </Text>
            )}
          </Group>

          <Group gap={4} mt={2} wrap="nowrap">
            {conv.lastMessage?.priority === 'urgente' && (
              <IconAlertTriangle size={11} color="var(--mantine-color-red-5)" style={{ flexShrink: 0 }} />
            )}
            <Text size="xs" truncate
              style={{ color: isActive ? 'rgba(255,255,255,0.6)' : 'var(--mantine-color-slate-5)' }}>
              {conv.lastMessage?.content ?? 'Nenhuma mensagem'}
            </Text>
            {conv.unreadCount > 0 && (
              <Badge size="xs" color="red" radius="xl" style={{ flexShrink: 0, marginLeft: 'auto' }}>
                {conv.unreadCount}
              </Badge>
            )}
          </Group>

          {/* Role badge para DM */}
          {other && (
            <Badge size="xs" color={ROLE_COLOR[other.role]} variant="light" radius="sm" mt={3}>
              {ROLE_LABEL[other.role]}
            </Badge>
          )}
        </Box>
      </Group>
    </UnstyledButton>
  );
}

// ─── Bolha de mensagem ────────────────────────────────────────────────────────
function MessageBubble({
  msg, isMe, showSender,
}: {
  msg: ChatMessage; isMe: boolean; showSender: boolean;
}) {
  const isUrgent = msg.priority === 'urgente';

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: isMe ? 'row-reverse' : 'row',
        gap: 8,
        alignItems: 'flex-end',
        maxWidth: '80%',
        marginLeft: isMe ? 'auto' : 0,
      }}
    >
      {/* Avatar (só no primeiro de cada bloco) */}
      {!isMe && (
        <Avatar
          size={28}
          radius="md"
          color={ROLE_COLOR[msg.senderRole]}
          variant="filled"
          style={{ flexShrink: 0, fontSize: 11, fontWeight: 700,
            visibility: showSender ? 'visible' : 'hidden' }}
        >
          {getInitials(msg.senderName)}
        </Avatar>
      )}

      <Box style={{ display: 'flex', flexDirection: 'column',
        alignItems: isMe ? 'flex-end' : 'flex-start', gap: 2 }}>
        {/* Nome + badge urgente (só no primeiro do bloco) */}
        {showSender && !isMe && (
          <Group gap={6} align="center">
            <Text size="xs" fw={700} c="slate.7">{msg.senderName}</Text>
            <Badge size="xs" color={ROLE_COLOR[msg.senderRole]} variant="light" radius="sm">
              {ROLE_LABEL[msg.senderRole]}
            </Badge>
            {isUrgent && (
              <Badge size="xs" color="red" variant="filled" radius="sm"
                leftSection={<IconAlertTriangle size={9} />}>
                URGENTE
              </Badge>
            )}
          </Group>
        )}
        {showSender && isMe && isUrgent && (
          <Badge size="xs" color="red" variant="filled" radius="sm"
            leftSection={<IconAlertTriangle size={9} />}>
            URGENTE
          </Badge>
        )}

        {/* Bolha */}
        <Paper
          p="xs"
          radius="md"
          style={{
            background: isMe
              ? 'var(--mantine-color-slate-8)'
              : '#fff',
            color: isMe ? '#fff' : 'var(--mantine-color-slate-8)',
            border: isUrgent
              ? '2px solid var(--mantine-color-red-5)'
              : isMe
                ? 'none'
                : '1px solid oklch(0.90 0.01 220)',
            borderLeft: isUrgent && !isMe ? '4px solid var(--mantine-color-red-5)' : undefined,
            maxWidth: '100%',
          }}
        >
          <Text size="sm" style={{ lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {msg.content}
          </Text>
        </Paper>

        {/* Hora */}
        <Text size="10px" c="dimmed" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </Box>
    </Box>
  );
}

// ─── Página principal (full-screen, fora do DashboardLayout) ─────────────────
export function Chat() {
  const { role, nome } = useAuth();
  const me = buildMeContact(nome, role);
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('geral');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [search, setSearch] = useState('');
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Carrega conversas
  useEffect(() => {
    chatService.listConversations().then(setConversations);
  }, []);

  // Carrega mensagens quando muda de conversa + marca como lida
  useEffect(() => {
    chatService.listMessages(activeConvId).then(msgs => {
      setMessages(msgs);
      setConversations(prev => prev.map(c =>
        c.id === activeConvId ? { ...c, unreadCount: 0 } : c,
      ));
    });
    // Avisa o servidor que lemos essa conversa
    chatService.markRead(activeConvId).catch(() => {});
  }, [activeConvId]);

  // Auto-scroll ao chegar nova mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Ouve novas mensagens em tempo real via WebSocket
  useEffect(() => {
    const unsub = chatService.onNewMessage((msg) => {
      if (msg.conversationId === activeConvId) {
        setMessages(prev => [...prev, msg]);
        // Já estamos lendo — marca lida imediatamente
        chatService.markRead(activeConvId).catch(() => {});
      } else {
        setConversations(prev => prev.map(c =>
          c.id === msg.conversationId
            ? { ...c, lastMessage: msg, unreadCount: c.unreadCount + 1 }
            : c,
        ));
      }
    });
    return unsub;
  }, [activeConvId]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await chatService.sendMessage(activeConvId, text, priority, me);
      setInput('');
      setPriority('normal');
    } finally {
      setSending(false);
    }
  }, [input, sending, activeConvId, priority, me]);

  const activeConv = conversations.find(c => c.id === activeConvId);
  const otherParticipant = activeConv?.type === 'direct'
    ? activeConv.participants.find(p => p.id !== me.id)
    : null;

  // Filtra conversas pelo search
  const filteredConvs = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Agrupa mensagens por remetente consecutivo
  const groupedMessages = messages.reduce<{ msg: ChatMessage; showSender: boolean }[]>(
    (acc, msg, i) => {
      const prev = messages[i - 1];
      const showSender = !prev || prev.senderId !== msg.senderId;
      acc.push({ msg, showSender });
      return acc;
    },
    [],
  );

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'oklch(0.985 0.006 210)' }}>

      {/* ── Barra de navegação superior ── */}
      <Box
        px="xl"
        style={{
          height: 56,
          flexShrink: 0,
          background: 'oklch(0.24 0.02 240)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          borderBottom: '3px solid oklch(0.30 0.02 240)',
        }}
      >
        <Button
          leftSection={<IconArrowLeft size={16} />}
          variant="light"
          color="gray"
          size="sm"
          radius="md"
          onClick={() => navigate('/main')}
          styles={{ root: { fontFamily: "'Manrope', sans-serif", fontWeight: 700 } }}
        >
          Voltar para o Painel
        </Button>

        <Divider orientation="vertical" color="oklch(0.35 0.02 240)" />

        <Group gap="xs">
          <ThemeIcon size="sm" radius="sm" variant="light" color="gray">
            <IconMessageCircle size={14} />
          </ThemeIcon>
          <Text fw={700} size="sm" c="white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Chat Interno
          </Text>
          <Text size="10px" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'oklch(0.60 0.03 230)' }}>
            · Comunicação da equipe HealthHub
          </Text>
        </Group>

        {/* Minha presença no canto direito */}
        <Box style={{ marginLeft: 'auto' }}>
          <Group gap="xs" wrap="nowrap">
            <Indicator color="green" size={8} offset={2} position="bottom-end">
              <Avatar size={30} radius="md" color={ROLE_COLOR[me.role]} variant="light"
                style={{ fontSize: 10, fontWeight: 700 }}>
                {getInitials(me.name)}
              </Avatar>
            </Indicator>
            <Box>
              <Text size="xs" fw={700} c="white" truncate maw={120}>{me.name}</Text>
              <Badge size="xs" color={ROLE_COLOR[me.role]} variant="light" radius="sm">
                {ROLE_LABEL[me.role]}
              </Badge>
            </Box>
          </Group>
        </Box>
      </Box>

      {/* Layout de duas colunas */}
      <Box style={{ display: 'flex', flex: 1, minHeight: 0, gap: 12, padding: 16 }}>

        {/* ── Coluna esquerda: lista de conversas ── */}
        <Box
          style={{
            width: 300,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid oklch(0.90 0.01 220)',
            borderRadius: 12,
            background: '#fff',
            overflow: 'hidden',
          }}
        >
          {/* Header da lista */}
          <Box p="sm" style={{ background: 'oklch(0.24 0.02 240)', flexShrink: 0 }}>
            <Text fw={700} size="sm" c="white" mb="xs"
              style={{ fontFamily: "'Manrope', sans-serif" }}>
              Conversas
            </Text>
            <TextInput
              placeholder="Buscar..."
              size="xs"
              radius="md"
              leftSection={<IconSearch size={13} />}
              value={search}
              onChange={e => setSearch(e.currentTarget.value)}
              styles={{
                input: { background: 'oklch(0.32 0.02 240)', border: 'none', color: '#fff',
                  '::placeholder': { color: 'oklch(0.55 0.02 230)' } },
              }}
            />
          </Box>

          {/* Lista */}
          <ScrollArea style={{ flex: 1 }} p="xs">
            <Stack gap={2}>
              {filteredConvs.map(conv => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isActive={conv.id === activeConvId}
                  me={me}
                  onClick={() => setActiveConvId(conv.id)}
                />
              ))}
              {filteredConvs.length === 0 && (
                <Text size="xs" c="dimmed" ta="center" py="md">
                  Nenhuma conversa encontrada
                </Text>
              )}
            </Stack>
          </ScrollArea>

        </Box>

        {/* ── Coluna direita: janela de mensagens ── */}
        <Box
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid oklch(0.90 0.01 220)',
            borderRadius: 12,
            background: '#fff',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          {activeConv ? (
            <>
              {/* Header da conversa */}
              <Box
                p="sm"
                style={{ background: 'oklch(0.24 0.02 240)', borderBottom: '3px solid oklch(0.30 0.02 240)', flexShrink: 0 }}
              >
                <Group gap="sm" wrap="nowrap">
                  {activeConv.type === 'group' ? (
                    <ThemeIcon size={36} radius="md" variant="light" color="gray">
                      <IconUsers size={18} />
                    </ThemeIcon>
                  ) : (
                    <Avatar size={36} radius="md" color={otherParticipant ? ROLE_COLOR[otherParticipant.role] : 'slate'}
                      variant="filled" style={{ fontSize: 13, fontWeight: 700 }}>
                      {getInitials(otherParticipant?.name ?? '?')}
                    </Avatar>
                  )}
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={700} size="sm" c="white" truncate style={{ fontFamily: "'Manrope', sans-serif" }}>
                      {activeConv.name}
                    </Text>
                    {activeConv.type === 'group' ? (
                      <Text size="10px" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'oklch(0.65 0.03 230)' }}>
                        {activeConv.participants.length} participantes · Canal geral
                      </Text>
                    ) : otherParticipant ? (
                      <Group gap={6}>
                        <Badge size="xs" color={ROLE_COLOR[otherParticipant.role]} variant="light" radius="sm">
                          {ROLE_LABEL[otherParticipant.role]}
                        </Badge>
                        {otherParticipant.online && (
                          <Group gap={4}>
                            <IconCircleFilled size={8} color="var(--mantine-color-green-5)" />
                            <Text size="10px" style={{ color: 'oklch(0.65 0.03 230)', fontFamily: "'IBM Plex Mono', monospace" }}>
                              online
                            </Text>
                          </Group>
                        )}
                      </Group>
                    ) : null}
                  </Box>
                </Group>
              </Box>

              {/* Área de mensagens */}
              <ScrollArea style={{ flex: 1 }} p="md" bg="slate.0">
                <Stack gap="xs">
                  {groupedMessages.map(({ msg, showSender }) => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isMe={msg.senderId === me.id}
                      showSender={showSender}
                    />
                  ))}
                  <div ref={bottomRef} />
                </Stack>
              </ScrollArea>

              {/* Input */}
              <Box
                p="sm"
                style={{ borderTop: '1px solid oklch(0.90 0.01 220)', background: '#fff', flexShrink: 0 }}
              >
                {/* Toggle de prioridade */}
                <Group gap="xs" mb="xs">
                  <Text size="10px" c="dimmed" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    PRIORIDADE:
                  </Text>
                  {(['normal', 'urgente'] as Priority[]).map(p => (
                    <UnstyledButton
                      key={p}
                      onClick={() => setPriority(p)}
                      px={8}
                      py={2}
                      style={{
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "'IBM Plex Mono', monospace",
                        border: `1.5px solid ${priority === p
                          ? p === 'urgente' ? 'var(--mantine-color-red-5)' : 'var(--mantine-color-slate-5)'
                          : 'oklch(0.88 0.01 220)'}`,
                        background: priority === p
                          ? p === 'urgente' ? 'var(--mantine-color-red-0)' : 'var(--mantine-color-slate-1)'
                          : 'transparent',
                        color: priority === p
                          ? p === 'urgente' ? 'var(--mantine-color-red-7)' : 'var(--mantine-color-slate-7)'
                          : 'var(--mantine-color-slate-4)',
                      }}
                    >
                      {p === 'urgente' && '⚠ '}{p.toUpperCase()}
                    </UnstyledButton>
                  ))}
                </Group>

                <Group gap="xs" wrap="nowrap">
                  <TextInput
                    style={{ flex: 1 }}
                    radius="md"
                    placeholder="Escreva uma mensagem..."
                    value={input}
                    onChange={e => setInput(e.currentTarget.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    disabled={sending}
                    styles={{
                      input: {
                        border: priority === 'urgente'
                          ? '1.5px solid var(--mantine-color-red-4)'
                          : '1.5px solid oklch(0.88 0.01 220)',
                      },
                    }}
                  />
                  <Tooltip label="Enviar (Enter)" withArrow>
                    <ActionIcon
                      size="lg"
                      color="slate"
                      variant="filled"
                      radius="md"
                      loading={sending}
                      disabled={!input.trim()}
                      onClick={handleSend}
                    >
                      <IconSend size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Box>
            </>
          ) : (
            <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <Stack align="center" gap="sm">
                <ThemeIcon size={56} radius="xl" color="slate" variant="light">
                  <IconMessageCircle size={28} />
                </ThemeIcon>
                <Text c="slate.5" size="sm">Selecione uma conversa</Text>
              </Stack>
            </Box>
          )}
        </Box>

      </Box>
    </Box>
  );
}
