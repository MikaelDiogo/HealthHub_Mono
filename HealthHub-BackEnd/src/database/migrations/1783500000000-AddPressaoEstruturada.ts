import { MigrationInterface, QueryRunner } from 'typeorm';

// Opção A: campos estruturados de pressão arterial (sistólica e diastólica, mmHg). Nulos nos registros antigos;
// o campo texto pressao_arterial continua existindo. Nenhum limiar clínico é definido por esta migration.
export class AddPressaoEstruturada1783500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sinais_vitais" ADD COLUMN "pressao_sistolica" smallint NULL`);
    await queryRunner.query(`ALTER TABLE "sinais_vitais" ADD COLUMN "pressao_diastolica" smallint NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sinais_vitais" DROP COLUMN "pressao_diastolica"`);
    await queryRunner.query(`ALTER TABLE "sinais_vitais" DROP COLUMN "pressao_sistolica"`);
  }
}
