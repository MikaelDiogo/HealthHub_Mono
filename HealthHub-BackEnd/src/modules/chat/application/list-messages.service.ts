import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Message } from '../domain/message.entity';
import { CHAT_REPOSITORY, IChatRepository } from '../domain/chat-repository.interface';

const DEFAULT_LIMIT = 100;

@Injectable()
export class ListMessagesService {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  async execute(conversationId: string, userId: string): Promise<Message[]> {
    const allowed = await this.chatRepository.isParticipant(conversationId, userId);
    if (!allowed) {
      throw new ForbiddenException({ error: 'Você não participa desta conversa.' });
    }

    return this.chatRepository.listMessages(conversationId, DEFAULT_LIMIT);
  }
}
