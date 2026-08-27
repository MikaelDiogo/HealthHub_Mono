import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.SECRET_KEY as string;
if (!process.env.SECRET_KEY) {
  throw new Error("SECRET_KEY não definida nas variáveis de ambiente. O servidor não pode iniciar.");
}

interface JwtPayload {
  id: string;
  nome: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Token não fornecido" });
    return;
  }

  const token = authHeader.split(" ")[1] as string;

  try {
    const decoded = jwt.verify(token, SECRET_KEY) as unknown as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Token inválido ou expirado" });
  }
}

export function checkRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Não autenticado" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "Acesso negado para este perfil" });
      return;
    }
    next();
  };
}
