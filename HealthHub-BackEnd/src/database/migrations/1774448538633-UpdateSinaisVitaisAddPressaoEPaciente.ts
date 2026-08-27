import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey } from "typeorm";

export class UpdateSinaisVitaisAddPressaoEPaciente1774448538633 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Garantir que a extensão de UUID esteja habilitada no Supabase
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        
        await queryRunner.createTable(new Table({
            name: "pacientes",
            columns: [
                { 
                    name: "id", 
                    type: "uuid", 
                    isPrimary: true, 
                    generationStrategy: "uuid", 
                    default: "uuid_generate_v4()" 
                },
                { name: "nome_completo", type: "varchar" },
                { name: "cpf", type: "varchar", isUnique: true },
                { name: "rg", type: "varchar", isNullable: true },
                { name: "idade", type: "int" },
                { name: "sexo", type: "varchar" },
                { name: "telefone", type: "varchar", isNullable: true },
                { name: "endereco", type: "text", isNullable: true },
                { name: "alergias", type: "text", isNullable: true },
                { name: "medicamentos_em_uso", type: "text", isNullable: true },
                { name: "anamnese", type: "text", isNullable: true },
                { 
                    name: "created_at", 
                    type: "timestamp", 
                    default: "now()" 
                }
            ]
        }));

        // 2. Converter a coluna patient_id de 'varchar' para 'uuid'
        // Isso é necessário para que o tipo seja compatível com o ID da tabela pacientes
        await queryRunner.query(`ALTER TABLE "sinais_vitais" ALTER COLUMN "patient_id" TYPE uuid USING "patient_id"::uuid`);

        // 3. Adicionar a nova coluna de Pressão Arterial
        await queryRunner.addColumn("sinais_vitais", new TableColumn({
            name: "pressao_arterial",
            type: "varchar",
            isNullable: true,
        }));

        // 4. Criar a Foreign Key (Ligação oficial entre as tabelas)
        await queryRunner.createForeignKey("sinais_vitais", new TableForeignKey({
            name: "FK_sinais_vitais_paciente",
            columnNames: ["patient_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "pacientes",
            onDelete: "CASCADE" 
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // O método down desfaz tudo na ordem inversa
        const table = await queryRunner.getTable("sinais_vitais");
        const foreignKey = table?.foreignKeys.find(fk => fk.name === "FK_sinais_vitais_paciente");
        
        if (foreignKey) {
            await queryRunner.dropForeignKey("sinais_vitais", foreignKey);
        }

        await queryRunner.dropColumn("sinais_vitais", "pressao_arterial");
        
        // Volta o tipo da coluna para varchar caso queira reverter
        await queryRunner.query(`ALTER TABLE "sinais_vitais" ALTER COLUMN "patient_id" TYPE varchar`);
        
        await queryRunner.dropTable("pacientes");
    }
}