// ─── Tipos públicos (interface permanece idêntica para os componentes) ─────────
export type Priority  = 'normal' | 'urgente';
export type RoleChat  = 'medico' | 'enfermeiro' | 'recepcionista';

export interface Contact {
  id: string;
  name: string;
  role: RoleChat;
  online?: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: RoleChat;
  content: string;
  timestamp: Date;
  priority: Priority;
}

export interface Conversation {
  id: string;
  type: 'group' | 'direct';
  name: string;
  participants: Contact[];
  lastMessage?: ChatMessage;
  unreadCount: number;
}

export interface IChatService {
  listConversations(): Promise<Conversation[]>;
  listContacts(): Promise<Contact[]>;
  listMessages(conversationId: string): Promise<ChatMessage[]>;
  sendMessage(conversationId: string, content: string, priority: Priority, sender: Contact): Promise<ChatMessage>;
  onNewMessage(cb: (msg: ChatMessage) => void): () => void;
  markRead(conversationId: string): Promise<void>;
  getOrCreateDM(contactId: string): Promise<Conversation>;
  getMyId(): string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const BASE_URL = 'http://localhost:3001';

/** Decodifica o payload do JWT sem biblioteca externa */
export function decodeJwtId(): string {
  const token = localStorage.getItem('token') ?? '';
  if (!token) return '';
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64));
    return payload.id ?? payload.sub ?? '';
  } catch { return ''; }
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token') ?? '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...(opts?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`);
  if (res.status === 204) return undefined as T;
  return res.json() as T;
}

// ─── Mapeadores API → interface local ─────────────────────────────────────────
function mapContact(c: { id: string; nome: string; role: string }): Contact {
  return { id: c.id, name: c.nome, role: c.role as RoleChat, online: true };
}

function mapMessage(raw: any, fallbackConvId?: string): ChatMessage {
  return {
    id: raw.id,
    conversationId: raw.conversation_id ?? fallbackConvId ?? '',
    senderId: raw.sender_id,
    senderName: raw.sender_nome ?? raw.senderName ?? '',
    senderRole: (raw.sender_role ?? raw.senderRole ?? 'enfermeiro') as RoleChat,
    content: raw.content,
    priority: (raw.priority ?? 'normal') as Priority,
    timestamp: new Date(raw.created_at ?? raw.timestamp ?? Date.now()),
  };
}

function mapConversation(item: any): Conversation {
  const conv  = item.conversation ?? item;
  const type  = (conv.type ?? 'group') as 'group' | 'direct';
  const peer  = item.peer ? mapContact(item.peer) : null;
  const name  = type === 'direct' && peer ? peer.name : (conv.name ?? 'Grupo Geral');
  const lastMsg = item.lastMessage
    ? mapMessage({ ...item.lastMessage, conversation_id: item.lastMessage.conversation_id ?? conv.id })
    : undefined;

  return {
    id: conv.id,
    type,
    name,
    participants: peer ? [peer] : [],
    lastMessage: lastMsg,
    unreadCount: item.unreadCount ?? 0,
  };
}

// ─── Implementação real (API REST + WebSocket Socket.IO) ───────────────────────
import { io, type Socket } from 'socket.io-client';

class RealChatService implements IChatService {
  private socket:    Socket | null = null;
  private listeners: ((msg: ChatMessage) => void)[] = [];
  private filaListeners: (() => void)[] = [];
  private seenIds  = new Set<string>();   // evita duplicata ACK + message:new
  private _myId    = '';

  constructor() {
    this._myId = decodeJwtId();
    this.connect();
  }

  // ── Conexão WebSocket ────────────────────────────────────────────────────────
  private connect() {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Desliga instância anterior
    this.socket?.removeAllListeners();
    this.socket?.disconnect();

    this.socket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    this.socket.on('connect', () => {
      console.info('[Chat WS] conectado:', this.socket?.id);
    });

    this.socket.on('message:new', (raw: any) => {
      const msg = mapMessage(raw);
      if (this.seenIds.has(msg.id)) return; // dedupe: já renderizado via ACK
      this.seenIds.add(msg.id);
      this.listeners.forEach(cb => cb(msg));
    });

    this.socket.on('fila:changed', () => {
      this.filaListeners.forEach(cb => cb());
    });

    this.socket.on('connect_error', (err: Error) => {
      console.warn('[Chat WS] erro de conexão:', err.message);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.info('[Chat WS] desconectado:', reason);
    });
  }

  // Reconecta com token renovado (chamado após login)
  reconnect() {
    this._myId = decodeJwtId();
    this.connect();
  }

  // Encerra a conexão (chamado no logout, evita socket autenticado como o usuário anterior)
  disconnect() {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this._myId = '';
    this.seenIds.clear();
  }

  // ── IChatService ─────────────────────────────────────────────────────────────
  async listConversations(): Promise<Conversation[]> {
    const data = await apiFetch<any[]>('/chat/conversations');
    return data.map(mapConversation);
  }

  async listContacts(): Promise<Contact[]> {
    const data = await apiFetch<any[]>('/chat/contacts');
    return data.map(mapContact);
  }

  async listMessages(conversationId: string): Promise<ChatMessage[]> {
    const data = await apiFetch<any[]>(`/chat/conversations/${conversationId}/messages`);
    return data.map(raw => mapMessage(raw, conversationId));
  }

  async sendMessage(
    conversationId: string,
    content: string,
    priority: Priority,
    _sender: Contact, // ignorado — servidor usa o token
  ): Promise<ChatMessage> {
    // Tenta via WebSocket (com ACK para entrega garantida)
    if (this.socket?.connected) {
      try {
        const ack = await this.socket.emitWithAck('message:send', {
          conversationId,
          content,
          priority,
        }) as { ok: boolean; message?: any };

        if (ack?.ok && ack.message) {
          const msg = mapMessage({ ...ack.message, conversation_id: conversationId });
          this.seenIds.add(msg.id); // evita duplicata quando message:new chegar
          return msg;
        }
      } catch (wsErr) {
        console.warn('[Chat WS] send falhou, usando REST:', wsErr);
      }
    }

    // Fallback REST
    const raw = await apiFetch<any>(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, priority }),
    });
    return mapMessage(raw, conversationId);
  }

  onNewMessage(cb: (msg: ChatMessage) => void): () => void {
    this.listeners.push(cb);
    return () => { this.listeners = this.listeners.filter(l => l !== cb); };
  }

  /** Dispara sempre que a esteira de atendimento muda em qualquer sessão conectada. */
  onFilaChanged(cb: () => void): () => void {
    this.filaListeners.push(cb);
    return () => { this.filaListeners = this.filaListeners.filter(l => l !== cb); };
  }

  async markRead(conversationId: string): Promise<void> {
    try {
      // Via socket (mais leve)
      this.socket?.emit('conversation:read', { conversationId });
      // Via REST como confirmação
      await apiFetch<void>(`/chat/conversations/${conversationId}/read`, { method: 'POST' });
    } catch { /* silencia — UI já zerou o contador local */ }
  }

  async getOrCreateDM(contactId: string): Promise<Conversation> {
    const raw = await apiFetch<any>('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ user_id: contactId }),
    });
    return mapConversation(raw);
  }

  getMyId(): string {
    if (!this._myId) this._myId = decodeJwtId();
    return this._myId;
  }
}

// Singleton — mesma instância em toda a sessão
export const chatService = new RealChatService();
