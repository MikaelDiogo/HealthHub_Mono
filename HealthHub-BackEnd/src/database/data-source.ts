import "reflect-metadata";
import { DataSource } from "typeorm";
import "dotenv/config";

// 1. Mantenha o .js aqui (O TS exige isso no modo nodenext)

import { SinaisVitais } from "../modules/patients/entities/SinaisVitais.js";
import { Paciente } from "../modules/patients/entities/Pacientes.js";
import { FilaPaciente } from "../modules/patients/entities/FilaPaciente.js";
import { User } from "../modules/users/entities/User.js";

const isProduction = process.env.NODE_ENV === "production";

export const AppDataSource = new DataSource({
    type: "postgres",
    // Se houver DATABASE_URL, usa ela. Caso contrário, usa os campos individuais.
    ...(process.env.DATABASE_URL
        ? {
            url: process.env.DATABASE_URL,
            ssl: { 
                rejectUnauthorized: false,
            },
            extra: { ssl: { rejectUnauthorized: false } }
          }
        : {
            host: process.env.DB_HOST || "localhost",
            port: Number(process.env.DB_PORT) || 5432,
            username: process.env.DB_USER || "postgres",
            password: process.env.DB_PASS || "",
            database: process.env.DB_NAME || "postgres",
            ssl: false
        }),
    synchronize: false, // Mantenha false para usar migrations
    logging: process.env.NODE_ENV !== 'production',
    
    // 2. Use as classes importadas diretamente
    entities: [SinaisVitais, Paciente, FilaPaciente, User],
    
    // 3. Nas migrations, use uma busca que aceite tanto .ts quanto .js
    migrations: ["src/database/migrations/*.{ts,js}"],
    subscribers: [],
});