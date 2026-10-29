import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

// Registro de rastreabilidade da esteira (autoria + data/hora de cada etapa e da classificação manual).
// Tabela só de acréscimo (append-only). NÃO contém conteúdo clínico de protocolo, nem regra de decisão.
// Sem backfill: registros anteriores à migration ficam sem eventos (nada é inventado).
export class CreateFilaEventos1783200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'fila_eventos',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'paciente_id', type: 'uuid' },
          { name: 'visita_id', type: 'uuid', isNullable: true },
          // Sem FK: a linha da fila é apagada na alta/remoção e o evento precisa continuar existindo
          { name: 'fila_id', type: 'uuid', isNullable: true },
          { name: 'tipo', type: 'varchar', length: '40' },
          { name: 'status_anterior', type: 'varchar', length: '50', isNullable: true },
          { name: 'status_novo', type: 'varchar', length: '50', isNullable: true },
          { name: 'gravidade', type: 'varchar', length: '50', isNullable: true },
          { name: 'justificativa', type: 'text', isNullable: true },
          { name: 'usuario_id', type: 'uuid', isNullable: true },
          { name: 'usuario_role', type: 'varchar', length: '20', isNullable: true },
          { name: 'criado_em', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'fila_eventos',
      new TableForeignKey({ name: 'FK_fila_eventos_paciente', columnNames: ['paciente_id'], referencedTableName: 'pacientes', referencedColumnNames: ['id'], onDelete: 'CASCADE' }),
    );
    await queryRunner.createForeignKey(
      'fila_eventos',
      new TableForeignKey({ name: 'FK_fila_eventos_visita', columnNames: ['visita_id'], referencedTableName: 'visitas', referencedColumnNames: ['id'], onDelete: 'SET NULL' }),
    );
    await queryRunner.createForeignKey(
      'fila_eventos',
      new TableForeignKey({ name: 'FK_fila_eventos_usuario', columnNames: ['usuario_id'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'SET NULL' }),
    );
    await queryRunner.createIndex('fila_eventos', new TableIndex({ name: 'IDX_fila_eventos_paciente_criado', columnNames: ['paciente_id', 'criado_em'] }));
    await queryRunner.createIndex('fila_eventos', new TableIndex({ name: 'IDX_fila_eventos_visita', columnNames: ['visita_id'] }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('fila_eventos', true);
  }
}
