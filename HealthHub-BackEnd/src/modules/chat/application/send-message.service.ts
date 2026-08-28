import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Message, MessagePriority } from '../domain/message.entity';
import { CHAT_REPOSITORY, IChatRepository } from '../domain/chat-repository.interface';

export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  senderNome: string;
  senderRole: string;
  content: string;
  priority?: MessagePriority;
}

@Injectable()
export class SendMessageService {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  async execute(input: SendMessageInput): Promise<Message> {
    const allowed = await this.chatRepository.isParticipant(input.conversationId, input.senderId);
    if (!allowed) {
      throw new ForbiddenException({ error: 'Você não participa desta conversa.' });
    }

    const message = await this.chatRepository.saveMessage({
      conversation_id: input.conversationId,
      sender_id: input.senderId,
      sender_nome: input.senderNome,
      sender_role: input.senderRole,
      content: input.content,
      priority: input.priority ?? 'normal',
    });

    // Quem envia já leu a própria mensagem
    await this.chatRepository.markAsRead(input.conversationId, input.senderId);

    return message;
  }
}
