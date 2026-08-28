import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CHAT_REPOSITORY, IChatRepository } from '../domain/chat-repository.interface';

@Injectable()
export class MarkAsReadService {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  async execute(conversationId: string, userId: string): Promise<void> {
    const allowed = await this.chatRepository.isParticipant(conversationId, userId);
    if (!allowed) {
      throw new ForbiddenException({ error: 'Você não participa desta conversa.' });
    }

    await this.chatRepository.markAsRead(conversationId, userId);
  }
}
