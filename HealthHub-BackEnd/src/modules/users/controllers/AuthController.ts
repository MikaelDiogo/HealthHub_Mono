import { Request, Response } from "express";
import { AuthService } from "../services/AuthService.js";
import { LoginSchema } from "../../../shared/infra/http/middlewares/schemas.js";

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Email e senha são obrigatórios" });
      return;
    }
    const { email, password } = parsed.data;

    try {
      const result = await new AuthService().execute(email, password);
      res.json({ auth: true, ...result });
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('[Auth] Falha no login para:', email, '-', error.message);
      }
      res.status(401).json({ auth: false, message: "Credenciais inválidas" });
    }
  }
}
