import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Text, Group, Stack, TextInput, ScrollArea, Avatar,
  Badge, ActionIcon, Paper, Tooltip, UnstyledButton,
  ThemeIcon, Divider, Indicator, Button,
} from '@mantine/core';
import {
  IconSearch, IconSend, IconAlertTriangle, IconUsers,
  IconUser, IconMessageCircle, IconCircleFilled, IconArrowLeft, IconInfoCircle,
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
      py={7}
      onClick={onClick}
      style={{
        backgroundColor: isActive ? 'var(--mantine-color-slate-1)' : 'transparent',
        borderBottom: '1px solid var(--mantine-color-slate-0)',
        transition: 'background 120ms ease',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--mantine-color-slate-0)'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      <Group gap="sm" wrap="nowrap">
        {/* Avatar */}
        {conv.type === 'group' ? (
          <ThemeIcon size={34} radius="xl" variant="light" color="hub" style={{ flexShrink: 0 }}>
            <IconUsers size={17} />
          </ThemeIcon>
        ) : (
          <Indicator
            disabled={!other?.online}
            color="green"
            size={8}
            offset={3}
            position="bottom-end"
            style={{ flexShrink: 0 }}
          >
            <Avatar size={34} radius="xl" color={other ? ROLE_COLOR[other.role] : 'hub'}
              variant="filled"
              style={{ fontSize: 12, fontWeight: 700 }}>
              {getInitials(other?.name ?? '?')}
            </Avatar>
          </Indicator>
        )}

        {/* Info */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" wrap="nowrap" gap={4}>
            <Text size="sm" fw={600} truncate c="hub.9">
              {conv.name}
            </Text>
            {conv.lastMessage && (
              <Text size="10px" c="slate.4" style={{ fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0 }}>
                {formatTime(conv.lastMessage.timestamp)}
              </Text>
            )}
          </Group>

          <Group gap={4} mt={1} wrap="nowrap">
            {conv.lastMessage?.priority === 'urgente' && (
              <IconAlertTriangle size={11} color="var(--mantine-color-red-5)" style={{ flexShrink: 0 }} />
            )}
            <Text size="xs" truncate c="slate.5">
              {conv.lastMessage?.content ?? 'Nenhuma mensagem'}
            </Text>
            {conv.unreadCount > 0 && (
              <Badge size="xs" color="hub.6" radius="xl" style={{ flexShrink: 0, marginLeft: 'auto' }}>
                {conv.unreadCount}
              </Badge>
            )}
          </Group>
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
          style={{
            background: isMe
              ? 'var(--mantine-color-hub-1)'
              : '#fff',
            color: 'var(--mantine-color-slate-8)',
            border: isUrgent ? '2px solid var(--mantine-color-red-5)' : 'none',
            borderLeft: isUrgent && !isMe ? '4px solid var(--mantine-color-red-5)' : undefined,
            borderRadius: 14,
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.07)',
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
  // Painel de detalhes fechado por padrão — abre só pelo ícone ⓘ
  const [showDetails, setShowDetails] = useState(false);
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
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#fff' }}>

      {/* ── Barra de navegação superior (clara, identidade HealthHub) ── */}
      <Box
        px="md"
        style={{
          height: 42,
          flexShrink: 0,
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--mantine-color-slate-2)',
        }}
      >
        {/* Usuário logado à esquerda */}
        <Group gap={8} wrap="nowrap">
          <Indicator color="green" size={7} offset={2} position="bottom-end">
            <Avatar size={26} radius="xl" color={ROLE_COLOR[me.role]} variant="filled"
              style={{ fontSize: 10, fontWeight: 700 }}>
              {getInitials(me.name)}
            </Avatar>
          </Indicator>
          <Text size="xs" fw={600} c="hub.9" truncate maw={160}>{me.name}</Text>
          <Badge size="xs" color={ROLE_COLOR[me.role]} variant="light" radius="sm">
            {ROLE_LABEL[me.role]}
          </Badge>
        </Group>

        <Divider orientation="vertical" color="var(--mantine-color-slate-2)" my={8} />

        <Group gap={8}>
          <IconMessageCircle size={15} color="var(--mantine-color-hub-6)" />
          <Text fw={700} size="sm" c="hub.9" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Chat Interno
          </Text>
        </Group>

        {/* Botão de voltar à direita */}
        <Button
          leftSection={<IconArrowLeft size={14} />}
          variant="subtle"
          color="hub.7"
          size="compact-sm"
          radius="md"
          onClick={() => navigate('/main')}
          style={{ marginLeft: 'auto' }}
          styles={{ root: { fontFamily: "'Manrope', sans-serif", fontWeight: 600 } }}
        >
          Voltar ao Painel
        </Button>
      </Box>

      {/* Layout de duas colunas — colado nas bordas, estilo WhatsApp */}
      <Box style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Coluna esquerda: lista de conversas ── */}
        <Box
          style={{
            width: 300,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid var(--mantine-color-slate-2)',
            background: '#fff',
            overflow: 'hidden',
          }}
        >
          {/* Header da lista (claro, busca estilo WhatsApp) */}
          <Box px="sm" py={8} style={{ background: '#fff', borderBottom: '1px solid var(--mantine-color-slate-1)', flexShrink: 0 }}>
            <TextInput
              placeholder="Buscar conversa..."
              size="xs"
              radius="xl"
              leftSection={<IconSearch size={13} color="var(--mantine-color-slate-4)" />}
              value={search}
              onChange={e => setSearch(e.currentTarget.value)}
              styles={{
                input: { background: 'var(--mantine-color-slate-1)', border: 'none', minHeight: 30, height: 30 },
              }}
            />
          </Box>

          {/* Lista */}
          <ScrollArea style={{ flex: 1 }}>
            <Stack gap={0}>
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
            background: '#fff',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          {activeConv ? (
            <>
              {/* Header da conversa (claro, estilo WhatsApp) */}
              <Box
                px="sm"
                py={6}
                style={{ background: '#fff', borderBottom: '1px solid var(--mantine-color-slate-2)', flexShrink: 0 }}
              >
                <Group gap="sm" wrap="nowrap">
                  {activeConv.type === 'group' ? (
                    <ThemeIcon size={28} radius="xl" variant="light" color="hub">
                      <IconUsers size={15} />
                    </ThemeIcon>
                  ) : (
                    <Avatar size={28} radius="xl" color={otherParticipant ? ROLE_COLOR[otherParticipant.role] : 'hub'}
                      variant="filled" style={{ fontSize: 11, fontWeight: 700 }}>
                      {getInitials(otherParticipant?.name ?? '?')}
                    </Avatar>
                  )}
                  <Group gap={8} style={{ flex: 1, minWidth: 0 }} wrap="nowrap">
                    <Text fw={700} size="sm" c="hub.9" truncate style={{ fontFamily: "'Manrope', sans-serif" }}>
                      {activeConv.name}
                    </Text>
                    {activeConv.type === 'group' ? (
                      <Text size="10px" c="slate.4" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        {activeConv.participants.length} participantes
                      </Text>
                    ) : otherParticipant ? (
                      <>
                        <Badge size="xs" color={ROLE_COLOR[otherParticipant.role]} variant="light" radius="sm">
                          {ROLE_LABEL[otherParticipant.role]}
                        </Badge>
                        {otherParticipant.online && (
                          <Group gap={4}>
                            <IconCircleFilled size={7} color="var(--mantine-color-green-5)" />
                            <Text size="10px" c="slate.4" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                              online
                            </Text>
                          </Group>
                        )}
                      </>
                    ) : null}
                  </Group>
                  <Tooltip label="Detalhes da conversa" withArrow>
                    <ActionIcon variant="subtle" color="hub.7" radius="xl" onClick={() => setShowDetails(s => !s)}>
                      <IconInfoCircle size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Box>

              {/* Área de mensagens — fundo cinza claro neutro */}
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
                px="md"
                pt="sm"
                pb={18}
                style={{ borderTop: '1px solid var(--mantine-color-slate-2)', background: '#fff', flexShrink: 0 }}
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
                        background: '#fff',
                        border: priority === 'urgente'
                          ? '1.5px solid var(--mantine-color-red-4)'
                          : '1px solid var(--mantine-color-slate-2)',
                      },
                    }}
                  />
                  <Tooltip label="Enviar (Enter)" withArrow>
                    <ActionIcon
                      size="lg"
                      color="hub.6"
                      variant="filled"
                      radius="md"
                      loading={sending}
                      disabled={!input.trim()}
                      onClick={handleSend}
                    >
                      <IconSend size={17} />
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

        {/* ── Painel de detalhes da conversa (inspirado no Freshchat) ── */}
        {activeConv && showDetails && (
          <Box
            visibleFrom="md"
            style={{
              width: 240,
              flexShrink: 0,
              borderLeft: '1px solid var(--mantine-color-slate-2)',
              background: '#fff',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Cabeçalho do contato */}
            <Stack align="center" gap={6} p="md" style={{ borderBottom: '1px solid var(--mantine-color-slate-1)' }}>
              {activeConv.type === 'group' ? (
                <ThemeIcon size={56} radius="xl" variant="light" color="hub">
                  <IconUsers size={28} />
                </ThemeIcon>
              ) : (
                <Avatar size={56} radius="xl"
                  color={otherParticipant ? ROLE_COLOR[otherParticipant.role] : 'hub'}
                  variant="filled" style={{ fontSize: 20, fontWeight: 700 }}>
                  {getInitials(otherParticipant?.name ?? '?')}
                </Avatar>
              )}
              <Text fw={700} size="sm" c="hub.9" ta="center">{activeConv.name}</Text>
              {activeConv.type === 'direct' && otherParticipant ? (
                <Group justify="center" gap={6}>
                  <Badge size="xs" color={ROLE_COLOR[otherParticipant.role]} variant="light" radius="sm">
                    {ROLE_LABEL[otherParticipant.role]}
                  </Badge>
                  {otherParticipant.online && (
                    <Badge size="xs" color="green" variant="dot" radius="sm">online</Badge>
                  )}
                </Group>
              ) : (
                <Text size="10px" c="slate.4" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  Canal geral da equipe
                </Text>
              )}
            </Stack>

            {/* Participantes */}
            <Box p="sm" style={{ flex: 1, overflow: 'auto' }}>
              <Text size="10px" fw={700} c="slate.4" tt="uppercase" mb={6} style={{ letterSpacing: '0.08em' }}>
                Participantes
              </Text>
              <Stack gap={6}>
                {activeConv.participants.map(p => (
                  <Group key={p.id} gap={8} wrap="nowrap">
                    <Avatar size={24} radius="xl" color={ROLE_COLOR[p.role]} variant="filled"
                      style={{ fontSize: 9, fontWeight: 700 }}>
                      {getInitials(p.name)}
                    </Avatar>
                    <Text size="xs" c="slate.7" truncate style={{ flex: 1 }}>
                      {p.name}{p.id === me.id ? ' (você)' : ''}
                    </Text>
                    <Badge size="xs" color={ROLE_COLOR[p.role]} variant="light" radius="sm">
                      {ROLE_LABEL[p.role]}
                    </Badge>
                  </Group>
                ))}
                {activeConv.participants.length === 0 && (
                  <Text size="xs" c="slate.4">Todos os profissionais participam.</Text>
                )}
              </Stack>
            </Box>
          </Box>
        )}

      </Box>
    </Box>
  );
}
