import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../../../shared/guards/jwt-auth.guard';
import { ListConversationsService } from '../application/list-conversations.service';
import { ListContactsService } from '../application/list-contacts.service';
import { OpenDirectConversationService } from '../application/open-direct-conversation.service';
import { ListMessagesService } from '../application/list-messages.service';
import { SendMessageService } from '../application/send-message.service';
import { MarkAsReadService } from '../application/mark-as-read.service';
import { ChatGateway } from './chat.gateway';
import { SendMessageDto } from './dtos/send-message.dto';
import { OpenDirectDto } from './dtos/open-direct.dto';

type AuthedRequest = Request & { user: JwtPayload };

/** Todas as rotas exigem apenas autenticação — chat é acessível a todos os perfis. */
@Controller('chat')
export class ChatController {
  constructor(
    private readonly listConversations: ListConversationsService,
    private readonly listContacts: ListContactsService,
    private readonly openDirect: OpenDirectConversationService,
    private readonly listMessages: ListMessagesService,
    private readonly sendMessage: SendMessageService,
    private readonly markAsRead: MarkAsReadService,
    private readonly gateway: ChatGateway,
  ) {}

  @Get('contacts')
  contacts(@Req() req: AuthedRequest) {
    return this.listContacts.execute(req.user.id);
  }

  @Get('conversations')
  conversations(@Req() req: AuthedRequest) {
    return this.listConversations.execute(req.user.id);
  }

  @Post('conversations')
  open(@Req() req: AuthedRequest, @Body() body: OpenDirectDto) {
    return this.openDirect.execute(req.user.id, body.user_id);
  }

  @Get('conversations/:id/messages')
  messages(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.listMessages.execute(id, req.user.id);
  }

  /** Fallback REST para envio — também propaga via WebSocket. */
  @Post('conversations/:id/messages')
  async send(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SendMessageDto,
  ) {
    const message = await this.sendMessage.execute({
      conversationId: id,
      senderId: req.user.id,
      senderNome: req.user.nome,
      senderRole: req.user.role,
      content: body.content,
      priority: body.priority,
    });

    await this.gateway.broadcastMessage(message);
    return message;
  }

  @Post('conversations/:id/read')
  @HttpCode(204)
  async read(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.markAsRead.execute(id, req.user.id);
  }
}
