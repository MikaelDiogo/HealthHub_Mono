import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateFilaPacientes1780358400000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        await queryRunner.createTable(new Table({
            name: "fila_pacientes",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()"
                },
                { name: "paciente_id", type: "uuid" },
                { name: "nome", type: "varchar" },
                { name: "idade", type: "int" },
                { name: "senha", type: "varchar" },
                { name: "chegada", type: "varchar" },
                { name: "status", type: "varchar" },
                { name: "gravidade", type: "varchar", isNullable: true },
                { name: "created_at", type: "timestamp", default: "now()" }
            ]
        }));

        await queryRunner.createForeignKey("fila_pacientes", new TableForeignKey({
            name: "FK_fila_pacientes_paciente",
            columnNames: ["paciente_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "pacientes",
            onDelete: "CASCADE"
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("fila_pacientes");
        const fk = table?.foreignKeys.find(k => k.name === "FK_fila_pacientes_paciente");
        if (fk) await queryRunner.dropForeignKey("fila_pacientes", fk);
        await queryRunner.dropTable("fila_pacientes");
    }
}
