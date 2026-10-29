import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box, Text, Group, Stack, TextInput, Textarea, ScrollArea, Avatar,
  ActionIcon, Tooltip, UnstyledButton, Indicator, Button, Modal, SegmentedControl, Title,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconSearch, IconSend, IconAlertTriangle, IconUsers,
  IconArrowLeft, IconInfoCircle, IconPlus, IconCheck, IconX,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HHMark, EmptyState } from '../../components/ui';
import {
  chatService,
  type Conversation, type ChatMessage, type Contact, type Priority, type RoleChat,
} from '../../services/chatService';

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Cor por papel profissional: é dado (quem fala), por isso aparece só no avatar.
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

type Filtro = 'todas' | 'diretas' | 'grupos';

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function formatTime(date: Date) {
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin} min`;
  if (diffMin < 1440) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatDayDivider(date: Date) {
  const now = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const ontem = new Date(now); ontem.setDate(now.getDate() - 1);
  if (isSameDay(date, now)) return 'Hoje';
  if (isSameDay(date, ontem)) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
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

// Avatar de pessoa (iniciais na cor do papel) ou de grupo (ícone neutro)
function ConvAvatar({ conv, other, size = 40 }: { conv: Conversation; other?: Contact | null; size?: number }) {
  if (conv.type === 'group') {
    return (
      <Avatar size={size} radius="md" color="slate" variant="light">
        <IconUsers size={Math.round(size * 0.45)} />
      </Avatar>
    );
  }
  return (
    <Indicator disabled={!other?.online} color="green" size={9} offset={4} position="bottom-end" withBorder>
      <Avatar size={size} radius="md" color={other ? ROLE_COLOR[other.role] : 'slate'} variant="light" fw={600}>
        {getInitials(other?.name ?? '?')}
      </Avatar>
    </Indicator>
  );
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
  const naoLidas = conv.unreadCount > 0;
  const urgente = conv.lastMessage?.priority === 'urgente';

  return (
    <UnstyledButton
      w="100%"
      px="sm"
      py={10}
      onClick={onClick}
      className="hh-row"
      aria-pressed={isActive}
      style={{ borderRadius: 'var(--hh-radius-card)' }}
    >
      <Group gap="sm" wrap="nowrap">
        <ConvAvatar conv={conv} other={other} />

        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" wrap="nowrap" gap={8}>
            <Text size="sm" fw={naoLidas ? 700 : 600} truncate c="var(--hh-ink)">
              {conv.name}
            </Text>
            {conv.lastMessage && (
              <Text size="xs" c={naoLidas ? 'var(--hh-accent)' : 'var(--hh-faint)'} fw={naoLidas ? 600 : 400} style={{ flexShrink: 0 }}>
                {formatTime(conv.lastMessage.timestamp)}
              </Text>
            )}
          </Group>

          <Group gap={6} mt={2} wrap="nowrap">
            <Text size="sm" truncate c={naoLidas ? 'var(--hh-ink)' : 'var(--hh-muted)'} style={{ flex: 1 }}>
              {urgente && <Text span c="var(--hh-negative)" fw={600} inherit>Urgente · </Text>}
              {conv.lastMessage?.content ?? 'Nenhuma mensagem ainda'}
            </Text>
            {naoLidas && (
              <Box
                aria-label={`${conv.unreadCount} não lidas`}
                style={{
                  minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, flexShrink: 0,
                  background: 'var(--hh-accent)', color: '#fff',
                  fontSize: 12, fontWeight: 600, display: 'grid', placeItems: 'center',
                }}
              >
                {conv.unreadCount}
              </Box>
            )}
          </Group>
        </Box>
      </Group>
    </UnstyledButton>
  );
}

// ─── Bolha de mensagem ────────────────────────────────────────────────────────
// Minhas: tinta escura à direita. Dos outros: superfície branca à esquerda.
// Mensagens seguidas do mesmo remetente formam um bloco (canto interno mais reto).
function MessageBubble({
  msg, isMe, showSender, lastOfBlock,
}: {
  msg: ChatMessage; isMe: boolean; showSender: boolean; lastOfBlock: boolean;
}) {
  const isUrgent = msg.priority === 'urgente';
  const hora = msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const r = 14;
  const raioBolha = isMe
    ? `${r}px ${showSender ? r : 4}px ${lastOfBlock ? r : 4}px ${r}px`
    : `${showSender ? r : 4}px ${r}px ${r}px ${lastOfBlock ? r : 4}px`;

  return (
    <Box
      className="hh-fade"
      style={{
        display: 'flex',
        flexDirection: isMe ? 'row-reverse' : 'row',
        gap: 10,
        alignItems: 'flex-end',
        maxWidth: 'min(72%, 640px)',
        marginLeft: isMe ? 'auto' : 0,
        marginTop: showSender ? 10 : 0,
      }}
    >
      {!isMe && (
        <Avatar
          size={30}
          radius="md"
          color={ROLE_COLOR[msg.senderRole]}
          variant="light"
          fw={600}
          style={{ flexShrink: 0, visibility: lastOfBlock ? 'visible' : 'hidden' }}
        >
          {getInitials(msg.senderName)}
        </Avatar>
      )}

      <Box style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 4, minWidth: 0 }}>
        {showSender && (!isMe || isUrgent) && (
          <Group gap={6} wrap="nowrap" px={2}>
            {!isMe && <Text size="xs" fw={600} c="var(--hh-ink)">{msg.senderName}</Text>}
            {!isMe && <Text size="xs" c="var(--hh-faint)">{ROLE_LABEL[msg.senderRole]}</Text>}
            {isUrgent && (
              <Group gap={4} wrap="nowrap">
                <IconAlertTriangle size={12} color="var(--hh-negative)" />
                <Text size="xs" fw={600} c="var(--hh-negative)">Urgente</Text>
              </Group>
            )}
          </Group>
        )}

        <Box
          px={14}
          py={9}
          style={{
            background: isMe ? 'var(--hh-ink)' : 'var(--hh-surface)',
            color: isMe ? '#fff' : 'var(--hh-ink)',
            border: isMe ? '1px solid var(--hh-ink)' : '1px solid var(--hh-border)',
            boxShadow: isUrgent ? 'inset 3px 0 0 var(--hh-negative)' : undefined,
            borderRadius: raioBolha,
            maxWidth: '100%',
          }}
        >
          <Text size="sm" style={{ lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} c="inherit">
            {msg.content}
          </Text>
        </Box>

        {lastOfBlock && (
          <Group gap={4} wrap="nowrap" px={2}>
            <Text size="xs" c="var(--hh-faint)">{hora}</Text>
            {isMe && <IconCheck size={13} color="var(--hh-faint)" aria-label="enviada" />}
          </Group>
        )}
      </Box>
    </Box>
  );
}

// ─── Divisor de dia ───────────────────────────────────────────────────────────
function DayDivider({ label }: { label: string }) {
  return (
    <Group gap="sm" my="md" wrap="nowrap" aria-label={label}>
      <Box style={{ flex: 1, height: 1, background: 'var(--hh-border)' }} />
      <Text size="xs" fw={500} c="var(--hh-faint)">{label}</Text>
      <Box style={{ flex: 1, height: 1, background: 'var(--hh-border)' }} />
    </Group>
  );
}

// ─── Modal: Nova mensagem (inicia uma conversa direta) ────────────────────────
function NovaMensagemModal({
  opened, onClose, contacts, onSelect,
}: {
  opened: boolean; onClose: () => void; contacts: Contact[]; onSelect: (c: Contact) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = contacts.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <Modal
      opened={opened}
      onClose={() => { onClose(); setQuery(''); }}
      title="Nova mensagem"
      centered
      size="sm"
    >
      <TextInput
        placeholder="Buscar colega"
        aria-label="Buscar colega"
        leftSection={<IconSearch size={14} />}
        value={query}
        onChange={e => setQuery(e.currentTarget.value)}
        mb="sm"
        data-autofocus
      />
      <Stack gap={2} mah={340} style={{ overflowY: 'auto' }} className="hh-stagger">
        {filtered.length === 0 && (
          <EmptyState message="Nenhum colega encontrado." />
        )}
        {filtered.map(c => (
          <UnstyledButton
            key={c.id}
            onClick={() => { onSelect(c); onClose(); setQuery(''); }}
            px="sm"
            py={8}
            className="hh-row"
            style={{ borderRadius: 'var(--hh-radius-control)' }}
          >
            <Group gap="sm" wrap="nowrap">
              <Indicator disabled={!c.online} color="green" size={8} offset={3} position="bottom-end" withBorder>
                <Avatar size={34} radius="md" color={ROLE_COLOR[c.role]} variant="light" fw={600}>
                  {getInitials(c.name)}
                </Avatar>
              </Indicator>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={600} c="var(--hh-ink)" truncate>{c.name}</Text>
                <Text size="xs" c="var(--hh-muted)">
                  {ROLE_LABEL[c.role]}{c.online ? ' · online' : ''}
                </Text>
              </Box>
            </Group>
          </UnstyledButton>
        ))}
      </Stack>
    </Modal>
  );
}

// ─── Página principal (full-screen, fora do DashboardLayout) ─────────────────
export function Chat() {
  const { role, nome } = useAuth();
  const me = buildMeContact(nome, role);
  const navigate = useNavigate();
  // No celular, lista e conversa ocupam a tela inteira, uma de cada vez
  const isMobile = useMediaQuery('(max-width: 767px)') ?? false;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [sending, setSending] = useState(false);
  // Painel de detalhes fechado por padrão — abre só pelo ícone ⓘ
  const [showDetails, setShowDetails] = useState(false);
  const [novaMensagemOpened, setNovaMensagemOpened] = useState(false);
  const [mobileView, setMobileView] = useState<'lista' | 'conversa'>('lista');
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // Carrega contatos + conversas em paralelo
  useEffect(() => {
    Promise.all([
      chatService.listConversations(),
      chatService.listContacts(),
    ]).then(([convs, contactList]) => {
      setAllContacts(contactList);
      setConversations(convs);
      // Abre o Grupo Geral automaticamente na primeira carga
      const group = convs.find(c => c.type === 'group');
      if (group) setActiveConvId(group.id);
      else if (convs.length > 0) setActiveConvId(convs[0].id);
    });
  }, []);

  // Carrega mensagens quando muda de conversa + marca como lida
  useEffect(() => {
    if (!activeConvId) return;
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
    const reduz = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    bottomRef.current?.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth' });
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
      composerRef.current?.focus();
    }
  }, [input, sending, activeConvId, priority, me]);

  const abrirConversa = useCallback((id: string) => {
    setActiveConvId(id);
    setMobileView('conversa');
  }, []);

  // Inicia (ou abre) uma conversa direta com um colega a partir do modal "Nova mensagem"
  const handleStartDM = useCallback(async (contact: Contact) => {
    const existing = conversations.find(
      c => c.type === 'direct' && c.participants.some(p => p.id === contact.id),
    );
    if (existing) {
      abrirConversa(existing.id);
      return;
    }
    const conv = await chatService.getOrCreateDM(contact.id);
    setConversations(prev => [conv, ...prev]);
    abrirConversa(conv.id);
  }, [conversations, abrirConversa]);

  const activeConv = conversations.find(c => c.id === activeConvId);
  const otherParticipant = activeConv?.type === 'direct'
    ? activeConv.participants.find(p => p.id !== me.id)
    : null;

  // Filtra conversas pelo search + pela aba selecionada
  const filteredConvs = conversations
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .filter(c => filtro === 'todas' ? true : filtro === 'grupos' ? c.type === 'group' : c.type === 'direct');

  // Agrupa mensagens por remetente consecutivo + insere divisores de dia
  const renderItems = useMemo(() => {
    type Item = { kind: 'divider'; label: string } | { kind: 'msg'; msg: ChatMessage; showSender: boolean; lastOfBlock: boolean };
    const items: Item[] = [];
    let lastDay = '';
    messages.forEach((msg, i) => {
      const dayLabel = formatDayDivider(msg.timestamp);
      if (dayLabel !== lastDay) {
        items.push({ kind: 'divider', label: dayLabel });
        lastDay = dayLabel;
      }
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const showSender = !prev || prev.senderId !== msg.senderId || items[items.length - 1]?.kind === 'divider';
      const lastOfBlock = !next || next.senderId !== msg.senderId || formatDayDivider(next.timestamp) !== dayLabel;
      items.push({ kind: 'msg', msg, showSender, lastOfBlock });
    });
    return items;
  }, [messages]);

  const participantesDetalhe = activeConv?.type === 'group'
    ? [me, ...allContacts]
    : otherParticipant ? [otherParticipant] : [];

  const mostrarLista = !isMobile || mobileView === 'lista';
  const mostrarConversa = !isMobile || mobileView === 'conversa';
  const urgente = priority === 'urgente';

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--hh-ground)' }}>

      <NovaMensagemModal
        opened={novaMensagemOpened}
        onClose={() => setNovaMensagemOpened(false)}
        contacts={allContacts}
        onSelect={handleStartDM}
      />

      {/* ── Barra superior ── */}
      <Box
        px={{ base: 'sm', sm: 'md' }}
        style={{
          height: 56,
          flexShrink: 0,
          background: 'var(--hh-surface)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--hh-border)',
        }}
      >
        <Button
          variant="subtle"
          color="slate"
          size="compact-sm"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate('/main')}
        >
          Painel
        </Button>
        <Box style={{ width: 1, height: 20, background: 'var(--hh-border)' }} />
        <Group gap={10} wrap="nowrap">
          <HHMark size={24} />
          <Title order={1} size={16} fw={700} c="var(--hh-ink)">Mensagens</Title>
        </Group>

        <Group gap={10} wrap="nowrap" ml="auto" visibleFrom="sm">
          <Box style={{ textAlign: 'right' }}>
            <Text size="sm" fw={600} c="var(--hh-ink)" lh={1.2} truncate maw={200}>{me.name}</Text>
            <Text size="xs" c="var(--hh-muted)" lh={1.2}>{ROLE_LABEL[me.role]}</Text>
          </Box>
          <Avatar size={32} radius="md" color={ROLE_COLOR[me.role]} variant="light" fw={600}>
            {getInitials(me.name)}
          </Avatar>
        </Group>
      </Box>

      <Box style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Coluna esquerda: lista de conversas ── */}
        {mostrarLista && (
          <Box
            style={{
              width: isMobile ? '100%' : 340,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              borderRight: isMobile ? undefined : '1px solid var(--hh-border)',
              background: 'var(--hh-surface)',
              overflow: 'hidden',
            }}
          >
            <Box px="md" pt="md" pb="sm" style={{ flexShrink: 0 }}>
              <Group justify="space-between" mb="md" wrap="nowrap">
                <Text fw={700} size="lg" c="var(--hh-ink)">Conversas</Text>
                <Button
                  size="xs"
                  variant="default"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => setNovaMensagemOpened(true)}
                >
                  Nova mensagem
                </Button>
              </Group>

              <TextInput
                placeholder="Buscar conversa"
                aria-label="Buscar conversa"
                leftSection={<IconSearch size={14} />}
                value={search}
                onChange={e => setSearch(e.currentTarget.value)}
                mb="sm"
              />

              <SegmentedControl
                fullWidth
                size="xs"
                value={filtro}
                onChange={(v) => setFiltro(v as Filtro)}
                aria-label="Filtrar conversas"
                transitionDuration={180}
                data={[
                  { value: 'todas', label: 'Todas' },
                  { value: 'diretas', label: 'Equipe' },
                  { value: 'grupos', label: 'Grupos' },
                ]}
              />
            </Box>

            <ScrollArea style={{ flex: 1 }} type="hover">
              <Stack gap={2} px="xs" pb="sm" className="hh-stagger" key={filtro}>
                {filteredConvs.map(conv => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isActive={conv.id === activeConvId && !isMobile}
                    me={me}
                    onClick={() => abrirConversa(conv.id)}
                  />
                ))}
                {filteredConvs.length === 0 && (
                  <Box px="xs" pt="xs">
                    <EmptyState message={search ? 'Nenhuma conversa com essa busca.' : 'Nenhuma conversa aqui ainda.'} />
                  </Box>
                )}
              </Stack>
            </ScrollArea>
          </Box>
        )}

        {/* ── Coluna central: conversa ── */}
        {mostrarConversa && (
          <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            {activeConv ? (
              <>
                {/* Cabeçalho da conversa */}
                <Group
                  gap="sm"
                  wrap="nowrap"
                  px={{ base: 'sm', sm: 'lg' }}
                  style={{ height: 64, flexShrink: 0, background: 'var(--hh-surface)', borderBottom: '1px solid var(--hh-border)' }}
                >
                  {isMobile && (
                    <ActionIcon variant="subtle" color="slate" size="lg" aria-label="Voltar às conversas" onClick={() => setMobileView('lista')}>
                      <IconArrowLeft size={18} />
                    </ActionIcon>
                  )}
                  <ConvAvatar conv={activeConv} other={otherParticipant} size={38} />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={600} size="md" c="var(--hh-ink)" truncate lh={1.3}>{activeConv.name}</Text>
                    <Text size="xs" c="var(--hh-muted)" truncate>
                      {activeConv.type === 'group'
                        ? `${allContacts.length + 1} participantes`
                        : otherParticipant
                          ? `${ROLE_LABEL[otherParticipant.role]} · ${otherParticipant.online ? 'online' : 'offline'}`
                          : ''}
                    </Text>
                  </Box>
                  <Tooltip label={showDetails ? 'Fechar detalhes' : 'Detalhes da conversa'}>
                    <ActionIcon
                      variant={showDetails ? 'light' : 'subtle'}
                      color="slate"
                      size="lg"
                      onClick={() => setShowDetails(s => !s)}
                      aria-label="Detalhes da conversa"
                      aria-pressed={showDetails}
                      visibleFrom="md"
                    >
                      <IconInfoCircle size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Group>

                {/* Mensagens */}
                {renderItems.length === 0 ? (
                  <Box key={activeConvId} className="hh-fade" p="xl" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <Text size="md" fw={600} c="var(--hh-ink)">Nenhuma mensagem ainda</Text>
                    <Text size="sm" c="var(--hh-muted)" mt={4} maw={340}>
                      Escreva a primeira mensagem para {activeConv.type === 'group' ? 'a equipe' : activeConv.name}. Use "Marcar como urgente" para o que não pode esperar.
                    </Text>
                  </Box>
                ) : (
                <ScrollArea style={{ flex: 1 }} type="hover">
                  <Box key={activeConvId} px={{ base: 'sm', sm: 'xl' }} py="md" style={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 960, margin: '0 auto' }}>
                    {renderItems.map((item, i) => item.kind === 'divider'
                      ? <DayDivider key={`d-${i}`} label={item.label} />
                      : (
                        <MessageBubble
                          key={item.msg.id}
                          msg={item.msg}
                          isMe={item.msg.senderId === me.id}
                          showSender={item.showSender}
                          lastOfBlock={item.lastOfBlock}
                        />
                      ))}
                    <div ref={bottomRef} />
                  </Box>
                </ScrollArea>
                )}

                {/* Campo de escrita: um bloco só, com a marcação de urgência dentro */}
                <Box px={{ base: 'sm', sm: 'xl' }} pt="xs" pb="md" style={{ flexShrink: 0 }}>
                  <Box
                    style={{
                      maxWidth: 960,
                      margin: '0 auto',
                      background: 'var(--hh-surface)',
                      border: `1px solid ${urgente ? 'var(--hh-negative)' : 'var(--hh-control)'}`,
                      borderRadius: 'var(--hh-radius-card)',
                      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
                      transition: 'border-color var(--hh-dur) var(--hh-ease)',
                    }}
                  >
                    <Textarea
                      ref={composerRef}
                      variant="unstyled"
                      autosize
                      minRows={1}
                      maxRows={5}
                      px="md"
                      pt={10}
                      placeholder={urgente ? 'Mensagem urgente para ' + activeConv.name : 'Mensagem para ' + activeConv.name}
                      aria-label="Escrever mensagem"
                      value={input}
                      onChange={e => setInput(e.currentTarget.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      disabled={sending}
                      styles={{ input: { fontSize: 14, lineHeight: 1.5 } }}
                    />
                    <Group justify="space-between" px="xs" pb={8} pt={2} wrap="nowrap">
                      <UnstyledButton
                        onClick={() => setPriority(urgente ? 'normal' : 'urgente')}
                        aria-pressed={urgente}
                        px={8}
                        py={4}
                        style={{
                          borderRadius: 'var(--hh-radius-control)',
                          background: urgente ? 'var(--hh-pill-negative-bg)' : 'transparent',
                          transition: 'background-color var(--hh-dur) var(--hh-ease)',
                        }}
                        className={urgente ? undefined : 'hh-row'}
                      >
                        <Group gap={6} wrap="nowrap">
                          {urgente
                            ? <IconX size={14} color="var(--hh-pill-negative-ink)" />
                            : <IconAlertTriangle size={14} color="var(--hh-muted)" />}
                          <Text size="xs" fw={600} c={urgente ? 'var(--hh-pill-negative-ink)' : 'var(--hh-muted)'}>
                            {urgente ? 'Urgente — toque para desmarcar' : 'Marcar como urgente'}
                          </Text>
                        </Group>
                      </UnstyledButton>

                      <Group gap="sm" wrap="nowrap">
                        <Text size="xs" c="var(--hh-faint)" visibleFrom="sm">Enter envia · Shift+Enter quebra linha</Text>
                        <ActionIcon
                          size="lg"
                          color={urgente ? 'red' : 'slate'}
                          variant="filled"
                          loading={sending}
                          disabled={!input.trim()}
                          onClick={handleSend}
                          aria-label="Enviar mensagem"
                        >
                          <IconSend size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Box>
                </Box>
              </>
            ) : (
              <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }} p="xl">
                <Box style={{ textAlign: 'center' }} maw={320}>
                  <Text size="md" fw={600} c="var(--hh-ink)">Nenhuma conversa aberta</Text>
                  <Text size="sm" c="var(--hh-muted)" mt={4}>
                    Escolha uma conversa à esquerda ou comece uma nova mensagem com um colega.
                  </Text>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* ── Painel de detalhes da conversa ── */}
        {activeConv && showDetails && !isMobile && (
          <Box
            visibleFrom="md"
            className="hh-fade"
            style={{
              width: 280,
              flexShrink: 0,
              borderLeft: '1px solid var(--hh-border)',
              background: 'var(--hh-surface)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <Stack align="center" gap={6} p="lg" style={{ borderBottom: '1px solid var(--hh-border)' }}>
              <ConvAvatar conv={activeConv} other={otherParticipant} size={56} />
              <Text fw={600} size="md" c="var(--hh-ink)" ta="center" mt={4}>{activeConv.name}</Text>
              <Text size="sm" c="var(--hh-muted)" ta="center">
                {activeConv.type === 'direct' && otherParticipant
                  ? `${ROLE_LABEL[otherParticipant.role]} · ${otherParticipant.online ? 'online' : 'offline'}`
                  : 'Canal geral da equipe'}
              </Text>
            </Stack>

            <ScrollArea style={{ flex: 1 }} type="hover">
              <Box p="md">
                <Text size="sm" fw={600} c="var(--hh-ink)" mb="sm">
                  {participantesDetalhe.length} {participantesDetalhe.length === 1 ? 'participante' : 'participantes'}
                </Text>
                <Stack gap={10}>
                  {participantesDetalhe.map(p => (
                    <Group key={p.id} gap={10} wrap="nowrap">
                      <Avatar size={30} radius="md" color={ROLE_COLOR[p.role]} variant="light" fw={600}>
                        {getInitials(p.name)}
                      </Avatar>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" c="var(--hh-ink)" truncate>
                          {p.name}{p.id === me.id ? ' (você)' : ''}
                        </Text>
                        <Text size="xs" c="var(--hh-muted)">{ROLE_LABEL[p.role]}</Text>
                      </Box>
                    </Group>
                  ))}
                </Stack>
              </Box>
            </ScrollArea>
          </Box>
        )}

      </Box>
    </Box>
  );
}
