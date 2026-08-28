import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './domain/conversation.entity';
import { ConversationParticipant } from './domain/conversation-participant.entity';
import { Message } from './domain/message.entity';
import { User } from '../auth/domain/user.entity';
import { CHAT_REPOSITORY } from './domain/chat-repository.interface';
import { TypeormChatRepository } from './infrastructure/typeorm-chat.repository';
import { ListConversationsService } from './application/list-conversations.service';
import { ListContactsService } from './application/list-contacts.service';
import { OpenDirectConversationService } from './application/open-direct-conversation.service';
import { ListMessagesService } from './application/list-messages.service';
import { SendMessageService } from './application/send-message.service';
import { MarkAsReadService } from './application/mark-as-read.service';
import { ChatController } from './presentation/chat.controller';
import { ChatGateway } from './presentation/chat.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, ConversationParticipant, Message, User])],
  controllers: [ChatController],
  providers: [
    ListConversationsService,
    ListContactsService,
    OpenDirectConversationService,
    ListMessagesService,
    SendMessageService,
    MarkAsReadService,
    ChatGateway,
    { provide: CHAT_REPOSITORY, useClass: TypeormChatRepository },
  ],
})
export class ChatModule {}
