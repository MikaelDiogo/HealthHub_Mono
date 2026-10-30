import { MigrationInterface, QueryRunner } from 'typeorm';

// Renomeia a coluna de visitas para o termo usado pelo sistema (classificação de risco registrada
// manualmente pelo enfermeiro). Apenas RENAME: os dados existentes são preservados.
export class RenameGravidadeToClassificacaoRisco1783300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "visitas" RENAME COLUMN "gravidade_manchester" TO "classificacao_risco"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "visitas" RENAME COLUMN "classificacao_risco" TO "gravidade_manchester"`);
  }
}
