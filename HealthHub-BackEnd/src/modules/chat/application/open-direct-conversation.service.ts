import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CHAT_REPOSITORY, ConversationSummary, IChatRepository } from '../domain/chat-repository.interface';

@Injectable()
export class OpenDirectConversationService {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  /** Retorna a conversa direta existente entre os dois usuários, ou cria uma nova. */
  async execute(currentUserId: string, targetUserId: string): Promise<ConversationSummary> {
    if (currentUserId === targetUserId) {
      throw new BadRequestException({ error: 'Não é possível abrir conversa consigo mesmo.' });
    }

    const users = await this.chatRepository.listAllUsers();
    const targetExists = users.some((u) => u.id === targetUserId);
    if (!targetExists) {
      throw new BadRequestException({ error: 'Usuário de destino não encontrado.' });
    }

    const existing = await this.chatRepository.findDirectConversation(currentUserId, targetUserId);
    const conversation = existing ?? await this.chatRepository.createDirectConversation(currentUserId, targetUserId);

    // Formato ConversationSummary (com `peer`) — mesmo shape usado na listagem,
    // necessário pro frontend saber com quem é a conversa recém-criada.
    return this.chatRepository.buildSummary(conversation, currentUserId);
  }
}
