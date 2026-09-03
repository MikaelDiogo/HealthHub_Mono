import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateVisitas1783000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'visitas',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'paciente_id', type: 'uuid' },
          { name: 'chegada', type: 'timestamp', default: 'now()' },
          { name: 'alta', type: 'timestamp', isNullable: true },
          { name: 'gravidade_manchester', type: 'varchar', isNullable: true },
          { name: 'motivo_visita', type: 'text', isNullable: true },
          // Em Atendimento | Alta | Internacao | Transferencia | Saida Voluntaria
          { name: 'desfecho', type: 'varchar', default: "'Em Atendimento'" },
          { name: 'observacoes', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'visitas',
      new TableForeignKey({
        name: 'FK_visitas_paciente',
        columnNames: ['paciente_id'],
        referencedTableName: 'pacientes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'visitas',
      new TableIndex({ name: 'IDX_visitas_paciente_id', columnNames: ['paciente_id'] }),
    );

    await queryRunner.createIndex(
      'visitas',
      new TableIndex({ name: 'IDX_visitas_desfecho', columnNames: ['desfecho'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('visitas', true);
  }
}
