import { Inject, Injectable } from '@nestjs/common';
import { CHAT_REPOSITORY, IChatRepository } from '../domain/chat-repository.interface';

@Injectable()
export class ListContactsService {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  async execute(currentUserId: string) {
    const users = await this.chatRepository.listAllUsers();
    return users.filter((u) => u.id !== currentUserId);
  }
}
