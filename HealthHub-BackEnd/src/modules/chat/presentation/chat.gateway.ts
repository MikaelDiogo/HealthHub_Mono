import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { Message } from '../domain/message.entity';
import { SendMessageService } from '../application/send-message.service';
import { MarkAsReadService } from '../application/mark-as-read.service';
import { CHAT_REPOSITORY, IChatRepository } from '../domain/chat-repository.interface';
import { Inject } from '@nestjs/common';
import { JwtPayload } from '../../../shared/guards/jwt-auth.guard';

interface AuthedSocket extends Socket {
  user?: JwtPayload;
}

/**
 * Tempo real do chat interno.
 * Autenticação: JWT no handshake (socket.handshake.auth.token).
 * Cada usuário entra na sala `user:<id>` — eventos são emitidos por participante.
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly sendMessage: SendMessageService,
    private readonly markAsRead: MarkAsReadService,
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  handleConnection(client: AuthedSocket) {
    const token =
      client.handshake.auth?.token ??
      (client.handshake.headers.authorization ?? '').replace('Bearer ', '');

    try {
      client.user = this.jwtService.verify<JwtPayload>(token);
      client.join(`user:${client.user.id}`);
    } catch {
      client.emit('error', { message: 'Token inválido ou expirado' });
      client.disconnect(true);
    }
  }

  /** Emite `message:new` para todos os participantes da conversa (inclusive o remetente). */
  async broadcastMessage(message: Message) {
    const participantIds = await this.chatRepository.listParticipantIds(message.conversation_id);
    for (const userId of participantIds) {
      this.server.to(`user:${userId}`).emit('message:new', message);
    }
  }

  @SubscribeMessage('message:send')
  async onSendMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string; content: string; priority?: 'normal' | 'urgente' },
  ) {
    if (!client.user) return { error: 'Não autenticado' };
    if (!body?.conversationId || !body?.content?.trim()) {
      return { error: 'conversationId e content são obrigatórios' };
    }

    try {
      const message = await this.sendMessage.execute({
        conversationId: body.conversationId,
        senderId: client.user.id,
        senderNome: client.user.nome,
        senderRole: client.user.role,
        content: body.content.trim().slice(0, 2000),
        priority: body.priority === 'urgente' ? 'urgente' : 'normal',
      });

      await this.broadcastMessage(message);
      return { ok: true, message };
    } catch {
      return { error: 'Você não participa desta conversa.' };
    }
  }

  @SubscribeMessage('conversation:read')
  async onConversationRead(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string },
  ) {
    if (!client.user || !body?.conversationId) return { error: 'Requisição inválida' };

    try {
      await this.markAsRead.execute(body.conversationId, client.user.id);
      return { ok: true };
    } catch {
      return { error: 'Você não participa desta conversa.' };
    }
  }
}
