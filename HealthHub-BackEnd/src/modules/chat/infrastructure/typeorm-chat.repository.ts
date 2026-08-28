import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Not, Repository } from 'typeorm';
import { Conversation } from '../domain/conversation.entity';
import { ConversationParticipant } from '../domain/conversation-participant.entity';
import { Message } from '../domain/message.entity';
import { User } from '../../auth/domain/user.entity';
import { ConversationSummary, IChatRepository } from '../domain/chat-repository.interface';

@Injectable()
export class TypeormChatRepository implements IChatRepository {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversations: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private readonly participants: Repository<ConversationParticipant>,
    @InjectRepository(Message)
    private readonly messages: Repository<Message>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  findGroupConversation(): Promise<Conversation | null> {
    return this.conversations.findOne({ where: { type: 'group' } });
  }

  findConversationById(id: string): Promise<Conversation | null> {
    return this.conversations.findOneBy({ id });
  }

  findDirectConversation(userA: string, userB: string): Promise<Conversation | null> {
    return this.conversations
      .createQueryBuilder('c')
      .innerJoin('conversation_participants', 'p1', 'p1.conversation_id = c.id AND p1.user_id = :userA', { userA })
      .innerJoin('conversation_participants', 'p2', 'p2.conversation_id = c.id AND p2.user_id = :userB', { userB })
      .where("c.type = 'direct'")
      .getOne();
  }

  async createDirectConversation(userA: string, userB: string): Promise<Conversation> {
    const conversation = await this.conversations.save(this.conversations.create({ type: 'direct' }));
    await this.participants.save([
      this.participants.create({ conversation_id: conversation.id, user_id: userA }),
      this.participants.create({ conversation_id: conversation.id, user_id: userB }),
    ]);
    return conversation;
  }

  async listUserConversations(userId: string): Promise<ConversationSummary[]> {
    const result: ConversationSummary[] = [];

    // Grupo Geral: todos participam implicitamente
    const group = await this.findGroupConversation();
    if (group) {
      result.push(await this.buildSummary(group, userId));
    }

    // Conversas diretas do usuário
    const directs = await this.conversations
      .createQueryBuilder('c')
      .innerJoin('conversation_participants', 'p', 'p.conversation_id = c.id AND p.user_id = :userId', { userId })
      .where("c.type = 'direct'")
      .getMany();

    for (const conv of directs) {
      result.push(await this.buildSummary(conv, userId));
    }

    // Mais recentes primeiro (grupo sempre no topo)
    return [
      result[0],
      ...result.slice(1).sort((a, b) => {
        const ta = a.lastMessage?.created_at?.getTime() ?? 0;
        const tb = b.lastMessage?.created_at?.getTime() ?? 0;
        return tb - ta;
      }),
    ];
  }

  private async buildSummary(conversation: Conversation, userId: string): Promise<ConversationSummary> {
    const lastMessage = await this.messages.findOne({
      where: { conversation_id: conversation.id },
      order: { created_at: 'DESC' },
    });

    const participant = await this.participants.findOneBy({
      conversation_id: conversation.id,
      user_id: userId,
    });

    const unreadWhere = participant?.last_read_at
      ? {
          conversation_id: conversation.id,
          sender_id: Not(userId),
          created_at: MoreThan(participant.last_read_at),
        }
      : { conversation_id: conversation.id, sender_id: Not(userId) };

    const unreadCount = await this.messages.countBy(unreadWhere);

    let peer: ConversationSummary['peer'] = null;
    if (conversation.type === 'direct') {
      const other = await this.participants.findOne({
        where: { conversation_id: conversation.id, user_id: Not(userId) },
        relations: ['user'],
      });
      if (other?.user) {
        peer = { id: other.user.id, nome: other.user.nome, role: other.user.role };
      }
    }

    return { conversation, lastMessage, unreadCount, peer };
  }

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const conversation = await this.findConversationById(conversationId);
    if (!conversation) return false;
    if (conversation.type === 'group') return true;

    const participant = await this.participants.findOneBy({
      conversation_id: conversationId,
      user_id: userId,
    });
    return !!participant;
  }

  async listMessages(conversationId: string, limit: number): Promise<Message[]> {
    const latest = await this.messages.find({
      where: { conversation_id: conversationId },
      order: { created_at: 'DESC' },
      take: limit,
    });
    return latest.reverse(); // ordem cronológica para exibição
  }

  saveMessage(data: Partial<Message>): Promise<Message> {
    return this.messages.save(this.messages.create(data));
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const existing = await this.participants.findOneBy({
      conversation_id: conversationId,
      user_id: userId,
    });

    if (!existing) {
      // Grupo: linha de participante criada sob demanda para guardar o last_read_at
      await this.participants.save(
        this.participants.create({ conversation_id: conversationId, user_id: userId }),
      );
    }

    // Usa o relógio do BANCO (now()) — mesmo referencial do created_at das mensagens.
    // Relógio do Node causaria unread incorreto por diferença de timezone.
    await this.participants
      .createQueryBuilder()
      .update()
      .set({ last_read_at: () => 'now()' })
      .where('conversation_id = :cid AND user_id = :uid', { cid: conversationId, uid: userId })
      .execute();
  }

  async listParticipantIds(conversationId: string): Promise<string[]> {
    const conversation = await this.findConversationById(conversationId);
    if (!conversation) return [];

    if (conversation.type === 'group') {
      const all = await this.users.find({ select: ['id'] });
      return all.map((u) => u.id);
    }

    const rows = await this.participants.findBy({ conversation_id: conversationId });
    return rows.map((r) => r.user_id);
  }

  listAllUsers(): Promise<Pick<User, 'id' | 'nome' | 'role'>[]> {
    return this.users.find({ select: ['id', 'nome', 'role'], order: { nome: 'ASC' } });
  }
}
