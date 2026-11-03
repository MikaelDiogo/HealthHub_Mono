import { MigrationInterface, QueryRunner } from 'typeorm';

// Garante uma única entrada na fila por paciente (a regra já existia só na aplicação; com requisições
// simultâneas ela falhava). As linhas da fila são removidas na alta/saída, então todas são "ativas":
// o índice único simples equivale a um índice parcial.
export class UniqueFilaPorPaciente1783400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_fila_pacientes_paciente" ON "fila_pacientes" ("paciente_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_fila_pacientes_paciente"`);
  }
}
