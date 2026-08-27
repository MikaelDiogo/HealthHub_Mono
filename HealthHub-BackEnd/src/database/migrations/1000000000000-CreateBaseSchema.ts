import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateBaseSchema1000000000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        await queryRunner.createTable(new Table({
            name: "sinais_vitais",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()"
                },
                { name: "patient_id", type: "varchar" },
                { name: "hora", type: "int" },
                { name: "frequencia_cardiaca", type: "float", isNullable: true },
                { name: "saturacao_oxigenio", type: "float", isNullable: true },
                { name: "temperatura", type: "float", isNullable: true },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP"
                }
            ]
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("sinais_vitais");
    }
}
