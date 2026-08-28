import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateChat1782600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.createTable(
      new Table({
        name: "conversations",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          // 'direct' (1:1) | 'group' (todos os profissionais) | 'patient' (thread futura)
          { name: "type", type: "varchar" },
          { name: "name", type: "varchar", isNullable: true },
          { name: "created_at", type: "timestamp", default: "now()" },
        ],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: "conversation_participants",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          { name: "conversation_id", type: "uuid" },
          { name: "user_id", type: "uuid" },
          { name: "last_read_at", type: "timestamp", isNullable: true },
          { name: "joined_at", type: "timestamp", default: "now()" },
        ],
        uniques: [{ columnNames: ["conversation_id", "user_id"] }],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: "messages",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          { name: "conversation_id", type: "uuid" },
          { name: "sender_id", type: "uuid" },
          // Denormalizado para exibição sem join (mensagens são imutáveis)
          { name: "sender_nome", type: "varchar" },
          { name: "sender_role", type: "varchar" },
          { name: "content", type: "text" },
          { name: "priority", type: "varchar", default: "'normal'" },
          { name: "created_at", type: "timestamp", default: "now()" },
        ],
      }),
      true
    );

    await queryRunner.createForeignKeys("conversation_participants", [
      new TableForeignKey({
        columnNames: ["conversation_id"],
        referencedTableName: "conversations",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
      new TableForeignKey({
        columnNames: ["user_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    ]);

    await queryRunner.createForeignKeys("messages", [
      new TableForeignKey({
        columnNames: ["conversation_id"],
        referencedTableName: "conversations",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
      new TableForeignKey({
        columnNames: ["sender_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    ]);

    // Grupo Geral fixo — todos os profissionais participam implicitamente
    await queryRunner.query(
      `INSERT INTO conversations (type, name) VALUES ('group', 'Grupo Geral')`
    );

    // Índices para as consultas mais frequentes
    await queryRunner.query(
      `CREATE INDEX idx_messages_conversation_created ON messages (conversation_id, created_at)`
    );
    await queryRunner.query(
      `CREATE INDEX idx_participants_user ON conversation_participants (user_id)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("messages");
    await queryRunner.dropTable("conversation_participants");
    await queryRunner.dropTable("conversations");
  }
}
