import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Conversation } from '../domain/conversation.entity';
import { CHAT_REPOSITORY, IChatRepository } from '../domain/chat-repository.interface';

@Injectable()
export class OpenDirectConversationService {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  /** Retorna a conversa direta existente entre os dois usuários, ou cria uma nova. */
  async execute(currentUserId: string, targetUserId: string): Promise<Conversation> {
    if (currentUserId === targetUserId) {
      throw new BadRequestException({ error: 'Não é possível abrir conversa consigo mesmo.' });
    }

    const users = await this.chatRepository.listAllUsers();
    const targetExists = users.some((u) => u.id === targetUserId);
    if (!targetExists) {
      throw new BadRequestException({ error: 'Usuário de destino não encontrado.' });
    }

    const existing = await this.chatRepository.findDirectConversation(currentUserId, targetUserId);
    if (existing) return existing;

    return this.chatRepository.createDirectConversation(currentUserId, targetUserId);
  }
}
