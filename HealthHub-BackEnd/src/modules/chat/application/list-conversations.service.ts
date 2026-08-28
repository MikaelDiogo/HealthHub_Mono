import { Inject, Injectable } from '@nestjs/common';
import { CHAT_REPOSITORY, ConversationSummary, IChatRepository } from '../domain/chat-repository.interface';

@Injectable()
export class ListConversationsService {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  execute(userId: string): Promise<ConversationSummary[]> {
    return this.chatRepository.listUserConversations(userId);
  }
}
