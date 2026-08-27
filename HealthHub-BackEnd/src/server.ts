import "reflect-metadata";
import "dotenv/config";
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { routes } from "./shared/infra/http/routes/index.js";
import { AppDataSource } from "./database/data-source.js";
import { AuthController } from "./modules/users/controllers/AuthController.js";

const app = express();
const authController = new AuthController();

// Segurança: headers HTTP
app.use(helmet());

// Segurança: limite de tamanho de payload (evita DoS)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: false }));

// Segurança: CORS restrito por ambiente
const allowedOrigins =
  process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGINS ?? '').split(',').map(o => o.trim()).filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:4173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// Segurança: rate limiting no login (máx 10 tentativas / 15 min por IP em prod)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { auth: false, message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

app.post('/login', loginLimiter, (req: Request, res: Response) => authController.login(req, res));

app.use(routes);

AppDataSource.initialize()
    .then(() => {
        console.log("Banco de Dados conectado!");

        const PORT = process.env.PORT || 3001;
        app.listen(Number(PORT), () => {
            console.log(`Servidor rodando em http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        if (error.code === 'ENOTFOUND') {
            const host = error.hostname || "configurado no .env";
            console.error(`Erro: O host (${host}) não foi encontrado. Verifique o DATABASE_URL no .env.`);
        } else if (error.code === 'ETIMEDOUT') {
            console.error("Erro de Conexão: Tempo limite esgotado. Tente usar a porta 6543 no DATABASE_URL.");
        } else {
            console.error("Erro ao conectar no Banco de Dados:", error.message);
        }
    });
