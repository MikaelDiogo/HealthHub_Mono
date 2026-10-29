import { Conversation } from './conversation.entity';
import { ConversationParticipant } from './conversation-participant.entity';
import { Message } from './message.entity';
import { User } from '../../auth/domain/user.entity';

export const CHAT_REPOSITORY = 'CHAT_REPOSITORY';

export interface ConversationSummary {
  conversation: Conversation;
  lastMessage: Message | null;
  unreadCount: number;
  /** Para conversas diretas: o outro participante */
  peer: { id: string; nome: string; role: string } | null;
}

export interface IChatRepository {
  findGroupConversation(): Promise<Conversation | null>;
  findConversationById(id: string): Promise<Conversation | null>;
  findDirectConversation(userA: string, userB: string): Promise<Conversation | null>;
  createDirectConversation(userA: string, userB: string): Promise<Conversation>;
  listUserConversations(userId: string): Promise<ConversationSummary[]>;
  buildSummary(conversation: Conversation, userId: string): Promise<ConversationSummary>;
  isParticipant(conversationId: string, userId: string): Promise<boolean>;
  listMessages(conversationId: string, limit: number): Promise<Message[]>;
  saveMessage(data: Partial<Message>): Promise<Message>;
  markAsRead(conversationId: string, userId: string): Promise<void>;
  listParticipantIds(conversationId: string): Promise<string[]>;
  listAllUsers(): Promise<Pick<User, 'id' | 'nome' | 'role'>[]>;
}
