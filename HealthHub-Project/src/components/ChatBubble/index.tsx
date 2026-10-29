import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Popover, ActionIcon, Badge, Box, Text, Group, Stack, Avatar,
  ScrollArea, TextInput, UnstyledButton, Indicator, Divider, Tooltip,
} from '@mantine/core';
import {
  IconMessageCircle, IconSend, IconAlertTriangle,
  IconChevronLeft, IconExternalLink, IconUsers,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  chatService,
  type Conversation, type ChatMessage, type Contact, type Priority, type RoleChat,
} from '../../services/chatService';

const ROLE_COLOR: Record<RoleChat, string> = {
  medico: 'blue', enfermeiro: 'green', recepcionista: 'orange',
};

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
}
function mapRole(role: string | null): RoleChat {
  if (role === 'medico' || role === 'enfermeiro' || role === 'recepcionista') return role;
  return 'enfermeiro';
}
function buildMe(nome: string | null, role: string | null): Contact {
  const r = mapRole(role);
  const realId = chatService.getMyId();
  return { id: realId || `user-${r}`, name: nome ?? 'Você', role: r, online: true };
}
function fmt(d: Date) {
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min`;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Mini lista de conversa ────────────────────────────────────────────────────
function ConvRow({ conv, me, onClick }: { conv: Conversation; me: Contact; onClick: () => void }) {
  const other = conv.type === 'direct' ? conv.participants.find(p => p.id !== me.id) : null;
  return (
    <UnstyledButton
      w="100%"
      px="sm"
      py={8}
      onClick={onClick}
      style={{ borderRadius: 8, transition: 'background 120ms' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--mantine-color-slate-0)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Group gap="sm" wrap="nowrap">
        {conv.type === 'group'
          ? <Avatar size={34} radius="md" color="slate" variant="filled"><IconUsers size={16} /></Avatar>
          : <Avatar size={34} radius="md" color={other ? ROLE_COLOR[other.role] : 'slate'} variant="filled"
              style={{ fontSize: 11, fontWeight: 700 }}>
              {getInitials(other?.name ?? '?')}
            </Avatar>
        }
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" wrap="nowrap" gap={4}>
            <Text size="xs" fw={700} c="slate.8" truncate>{conv.name}</Text>
            <Group gap={4} style={{ flexShrink: 0 }}>
              {conv.unreadCount > 0 && (
                <Badge size="xs" color="red" radius="xl">{conv.unreadCount}</Badge>
              )}
              {conv.lastMessage && (
                <Text size="10px" c="dimmed" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  {fmt(conv.lastMessage.timestamp)}
                </Text>
              )}
            </Group>
          </Group>
          {conv.lastMessage && (
            <Group gap={4} mt={1} wrap="nowrap">
              {conv.lastMessage.priority === 'urgente' && (
                <IconAlertTriangle size={10} color="var(--mantine-color-red-5)" style={{ flexShrink: 0 }} />
              )}
              <Text size="11px" c="slate.5" truncate>{conv.lastMessage.content}</Text>
            </Group>
          )}
        </Box>
      </Group>
    </UnstyledButton>
  );
}

// ─── Painel de resposta rápida ─────────────────────────────────────────────────
function QuickReply({
  conv, me, onBack,
}: { conv: Conversation; me: Contact; onBack: () => void }) {
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatService.listMessages(conv.id).then(m => setMsgs(m.slice(-6)));
  }, [conv.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  useEffect(() => {
    return chatService.onNewMessage(msg => {
      if (msg.conversationId === conv.id) setMsgs(prev => [...prev, msg].slice(-6));
    });
  }, [conv.id]);

  const send = useCallback(async () => {
    const t = input.trim();
    if (!t || sending) return;
    setSending(true);
    try { await chatService.sendMessage(conv.id, t, priority, me); setInput(''); }
    finally { setSending(false); }
  }, [input, sending, conv.id, priority, me]);

  const other = conv.type === 'direct' ? conv.participants.find(p => p.id !== me.id) : null;

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: 340 }}>
      {/* Header mini */}
      <Box p="xs" style={{ background: 'oklch(0.24 0.02 240)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ActionIcon variant="subtle" color="gray" size="sm" onClick={onBack}>
          <IconChevronLeft size={14} />
        </ActionIcon>
        {conv.type === 'group'
          ? <Avatar size={26} radius="sm" color="slate" variant="light"><IconUsers size={13} /></Avatar>
          : <Avatar size={26} radius="sm" color={other ? ROLE_COLOR[other.role] : 'slate'} variant="filled"
              style={{ fontSize: 9, fontWeight: 700 }}>{getInitials(other?.name ?? '?')}</Avatar>
        }
        <Text size="xs" fw={700} c="white" truncate style={{ flex: 1 }}>{conv.name}</Text>
      </Box>

      {/* Mensagens */}
      <ScrollArea style={{ flex: 1 }} p="xs" bg="slate.0">
        <Stack gap={6}>
          {msgs.map(msg => {
            const isMe = msg.senderId === me.id;
            return (
              <Box key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 6, alignItems: 'flex-end' }}>
                {!isMe && (
                  <Avatar size={22} radius="sm" color={ROLE_COLOR[msg.senderRole]} variant="filled" style={{ fontSize: 8, fontWeight: 700, flexShrink: 0 }}>
                    {getInitials(msg.senderName)}
                  </Avatar>
                )}
                <Box style={{ maxWidth: '82%' }}>
                  {!isMe && <Text size="10px" fw={600} c="slate.6" mb={1}>{msg.senderName}</Text>}
                  <Box
                    px="xs"
                    py={6}
                    style={{
                      borderRadius: 8,
                      background: isMe ? 'var(--mantine-color-slate-8)' : '#fff',
                      border: msg.priority === 'urgente' ? '1.5px solid var(--mantine-color-red-4)'
                        : isMe ? 'none' : '1px solid oklch(0.90 0.01 220)',
                    }}
                  >
                    {msg.priority === 'urgente' && (
                      <Group gap={4} mb={2}>
                        <IconAlertTriangle size={10} color="var(--mantine-color-red-5)" />
                        <Text size="9px" fw={700} c="red">URGENTE</Text>
                      </Group>
                    )}
                    <Text size="xs" style={{ color: isMe ? '#fff' : 'var(--mantine-color-slate-8)', lineHeight: 1.4 }}>
                      {msg.content}
                    </Text>
                  </Box>
                  <Text size="9px" c="dimmed" ta={isMe ? 'right' : 'left'} mt={1}
                    style={{ fontFamily: "'Manrope', sans-serif" }}>
                    {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </Box>
              </Box>
            );
          })}
          <div ref={bottomRef} />
        </Stack>
      </ScrollArea>

      {/* Toggle urgente + Input */}
      <Box px="xs" py="xs" style={{ borderTop: '1px solid oklch(0.90 0.01 220)', background: '#fff', flexShrink: 0 }}>
        <Group gap={4} mb={6}>
          {(['normal', 'urgente'] as Priority[]).map(p => (
            <UnstyledButton
              key={p}
              onClick={() => setPriority(p)}
              px={6}
              py={2}
              style={{
                borderRadius: 5, fontSize: 10, fontWeight: 700,
                fontFamily: "'Manrope', sans-serif",
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
              {p === 'urgente' ? '⚠ URGENTE' : 'NORMAL'}
            </UnstyledButton>
          ))}
        </Group>
        <Group gap="xs" wrap="nowrap">
          <TextInput
            style={{ flex: 1 }}
            size="xs"
            radius="md"
            placeholder="Resposta rápida... (Enter)"
            value={input}
            onChange={e => setInput(e.currentTarget.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
            disabled={sending}
            styles={{
              input: {
                border: priority === 'urgente' ? '1.5px solid var(--mantine-color-red-4)' : '1.5px solid oklch(0.88 0.01 220)',
              },
            }}
          />
          <ActionIcon size="sm" color="slate" variant="filled" radius="md"
            loading={sending} disabled={!input.trim()} onClick={send}>
            <IconSend size={13} />
          </ActionIcon>
        </Group>
      </Box>
    </Box>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export function ChatBubble() {
  const { role, nome } = useAuth();
  const me = buildMe(nome, role);
  const navigate = useNavigate();

  const [opened, setOpened] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);

  // Carrega conversas e soma unread inicial
  useEffect(() => {
    chatService.listConversations().then(convs => {
      setConversations(convs);
      setTotalUnread(convs.reduce((s, c) => s + c.unreadCount, 0));
    });
  }, []);

  // Escuta novas mensagens em tempo real
  useEffect(() => {
    return chatService.onNewMessage(msg => {
      if (msg.senderId === me.id) return; // ignora próprias mensagens
      setConversations(prev => prev.map(c =>
        c.id === msg.conversationId
          ? { ...c, lastMessage: msg, unreadCount: c.unreadCount + 1 }
          : c,
      ));
      setTotalUnread(prev => prev + 1);
    });
  }, [me.id]);

  // Ao abrir o popover: reseta unread da conversa ativa se houver
  const handleOpen = () => {
    setOpened(o => !o);
    if (!opened) setActiveConv(null);
  };

  // Ao selecionar conversa no painel: zera unread e avisa servidor
  const selectConv = (conv: Conversation) => {
    setActiveConv(conv);
    const delta = conv.unreadCount;
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));
    setTotalUnread(prev => Math.max(0, prev - delta));
    chatService.markRead(conv.id).catch(() => {});
  };

  return (
    <Popover
      opened={opened}
      onClose={() => setOpened(false)}
      position="top-end"
      offset={12}
      withArrow
      arrowPosition="side"
      shadow="xl"
      radius="lg"
      width={320}
      zIndex={250}
    >
      <Popover.Target>
        <Box style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 250 }}>
          <Indicator
            label={totalUnread > 0 ? String(totalUnread > 99 ? '99+' : totalUnread) : undefined}
            disabled={totalUnread === 0}
            color="red"
            size={18}
            offset={4}
            styles={{ indicator: { fontSize: 10, fontWeight: 700 } }}
          >
            <Tooltip label="Chat da equipe" position="left" withArrow>
              <ActionIcon
                size={52}
                radius="xl"
                onClick={handleOpen}
                style={{
                  background: opened ? 'oklch(0.30 0.02 240)' : 'oklch(0.24 0.02 240)',
                  boxShadow: '0 4px 20px -4px oklch(0.24 0.02 240 / 0.5)',
                  transition: 'background 150ms ease',
                }}
              >
                <IconMessageCircle size={24} color="#fff" />
              </ActionIcon>
            </Tooltip>
          </Indicator>
        </Box>
      </Popover.Target>

      <Popover.Dropdown p={0} style={{ overflow: 'hidden', border: '1px solid oklch(0.90 0.01 220)' }}>
        {activeConv ? (
          <QuickReply conv={activeConv} me={me} onBack={() => setActiveConv(null)} />
        ) : (
          <Box style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Header do popover */}
            <Box
              px="sm"
              py="xs"
              style={{
                background: 'oklch(0.24 0.02 240)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text fw={700} size="sm" c="white" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Chat Interno
              </Text>
              <Tooltip label="Abrir chat completo" withArrow position="left">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={() => { setOpened(false); navigate('/chat'); }}
                >
                  <IconExternalLink size={14} />
                </ActionIcon>
              </Tooltip>
            </Box>

            {/* Lista de conversas */}
            <ScrollArea mah={360} p="xs">
              <Stack gap={2}>
                {conversations.length === 0 ? (
                  <Text size="xs" c="dimmed" ta="center" py="md">Nenhuma conversa</Text>
                ) : (
                  conversations.map(conv => (
                    <ConvRow key={conv.id} conv={conv} me={me} onClick={() => selectConv(conv)} />
                  ))
                )}
              </Stack>
            </ScrollArea>

            <Divider color="oklch(0.92 0.01 220)" />
            <UnstyledButton
              w="100%"
              py="xs"
              px="sm"
              onClick={() => { setOpened(false); navigate('/chat'); }}
              style={{ textAlign: 'center' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--mantine-color-slate-0)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Text size="xs" fw={600} c="slate.6" style={{ fontFamily: "'Manrope', sans-serif" }}>
                ABRIR CHAT COMPLETO →
              </Text>
            </UnstyledButton>
          </Box>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}
