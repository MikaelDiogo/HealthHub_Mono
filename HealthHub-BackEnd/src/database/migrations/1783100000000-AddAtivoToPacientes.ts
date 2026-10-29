import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAtivoToPacientes1783100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'pacientes',
      new TableColumn({ name: 'ativo', type: 'boolean', default: true }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('pacientes', 'ativo');
  }
}
