import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../guards/jwt-auth.guard';

interface AuthedSocket extends Socket {
  user?: JwtPayload;
}

/**
 * Canal de eventos gerais em tempo real (fora do domínio de chat).
 * Compartilha o mesmo namespace "/" do ChatGateway — o cliente usa a
 * conexão Socket.IO já aberta para o chat, sem abrir um segundo socket.
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: AuthedSocket) {
    const token =
      client.handshake.auth?.token ??
      (client.handshake.headers.authorization ?? '').replace('Bearer ', '');

    try {
      client.user = this.jwtService.verify<JwtPayload>(token);
    } catch {
      // Autenticação já é tratada pelo ChatGateway na mesma conexão.
    }
  }

  /** Avisa todos os clientes conectados que a esteira de atendimento mudou. */
  broadcastFilaChanged() {
    this.server.emit('fila:changed');
  }
}
