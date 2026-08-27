import { z } from "zod";

export const CreatePatientSchema = z.object({
  nome_completo: z.string().min(3, "Nome deve ter ao menos 3 caracteres").max(150),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve conter exatamente 11 dígitos numéricos"),
  rg: z.string().max(20).optional(),
  idade: z.coerce.number().int().min(0).max(150),
  sexo: z.enum(["M", "F", "Outro"]),
  telefone: z.string().regex(/^\d{10,11}$/, "Telefone deve ter 10 ou 11 dígitos").optional(),
  endereco: z.string().max(300).optional(),
  alergias: z.string().max(1000).optional(),
  medicamentos_em_uso: z.string().max(1000).default(""),
  anamnese: z.string().max(5000).optional(),
});

export const UpdatePatientSchema = CreatePatientSchema.partial();

export const LoginSchema = z.object({
  email: z.string().email("Email inválido").max(200),
  password: z.string().min(1, "Senha é obrigatória").max(200),
});

export const SinaisVitaisSchema = z.object({
  frequencia_cardiaca: z.coerce.number().int().min(0).max(300).optional(),
  saturacao_oxigenio: z.coerce.number().min(0).max(100).optional(),
  pressao_arterial: z.string().max(20).optional(),
  temperatura: z.coerce.number().min(25).max(45).optional(),
  hora: z.coerce.number().optional(),
});
