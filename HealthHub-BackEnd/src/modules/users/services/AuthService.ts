import { AppDataSource } from "../../../database/data-source.js";
import { User } from "../entities/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.SECRET_KEY as string;
if (!process.env.SECRET_KEY) {
  throw new Error("SECRET_KEY não definida nas variáveis de ambiente.");
}

export class AuthService {
  async execute(email: string, password: string) {
    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo.findOne({ where: { email } });
    if (!user) throw new Error("Credenciais inválidas");

    const senhaValida = await bcrypt.compare(password, user.senha);
    if (!senhaValida) throw new Error("Credenciais inválidas");

    const token = jwt.sign(
      { id: user.id, nome: user.nome, role: user.role },
      SECRET_KEY,
      { expiresIn: "1d" }
    );

    return { token, role: user.role, nome: user.nome };
  }
}
