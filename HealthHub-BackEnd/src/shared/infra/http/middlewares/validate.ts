import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        campo: e.path.join('.'),
        mensagem: e.message,
      }));
      res.status(400).json({ error: "Dados inválidos", detalhes: errors });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateUUID(paramName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[paramName] as string | undefined;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!value || !uuidRegex.test(value)) {
      res.status(400).json({ error: `Parâmetro '${paramName}' deve ser um UUID válido.` });
      return;
    }
    next();
  };
}
