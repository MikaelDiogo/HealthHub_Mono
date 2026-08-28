// Smoke test do ChatGateway: dois usuários conectados, um envia, o outro recebe.
// Uso: node scripts/ws-smoke-test.mjs
import { io } from 'socket.io-client';
import 'dotenv/config';

const API = 'http://localhost:3001';

async function login(email, password) {
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.auth) throw new Error(`Login falhou para ${email}`);
  return data.token;
}

function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io(API, { auth: { token }, transports: ['websocket'] });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
    setTimeout(() => reject(new Error('timeout de conexão')), 5000);
  });
}

const medicoToken = await login('medico@healthhub.com', process.env.SEED_MEDICO_SENHA);
const enfToken = await login('enfermeiro@healthhub.com', process.env.SEED_ENFERMEIRO_SENHA);

// Descobre a conversa direta existente
const convs = await (
  await fetch(`${API}/chat/conversations`, { headers: { Authorization: `Bearer ${medicoToken}` } })
).json();
const direct = convs.find((c) => c.conversation.type === 'direct').conversation;

const medico = await connect(medicoToken);
const enfermeiro = await connect(enfToken);
console.log('✔ Ambos conectados ao gateway');

const received = new Promise((resolve, reject) => {
  enfermeiro.on('message:new', (msg) => resolve(msg));
  setTimeout(() => reject(new Error('enfermeiro não recebeu a mensagem em 5s')), 5000);
});

const ack = await medico.emitWithAck('message:send', {
  conversationId: direct.id,
  content: 'Teste WebSocket em tempo real',
  priority: 'urgente',
});
console.log('✔ ACK do envio:', ack.ok ? `ok (id ${ack.message.id})` : ack.error);

const msg = await received;
console.log(`✔ Enfermeiro recebeu em tempo real: [${msg.priority}] ${msg.sender_nome}: ${msg.content}`);

// Teste de segurança: token inválido deve ser desconectado
const invalido = io(API, { auth: { token: 'token-falso' }, transports: ['websocket'] });
await new Promise((resolve) => {
  invalido.on('disconnect', () => {
    console.log('✔ Cliente com token inválido foi desconectado pelo servidor');
    resolve();
  });
  setTimeout(resolve, 3000);
});

medico.close();
enfermeiro.close();
invalido.close();
console.log('WS SMOKE TEST: TUDO OK');
process.exit(0);
