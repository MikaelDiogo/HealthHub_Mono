import { MigrationInterface, QueryRunner } from 'typeorm';

// Cadastro mínimo: só o nome é obrigatório. CPF, idade e sexo passam a aceitar NULL (o CPF segue único quando
// preenchido: no PostgreSQL vários NULL não colidem) e a cópia da idade na fila também. A coluna nome_provisorio
// marca o paciente cujo nome foi gerado pelo sistema ("Paciente não identificado (#xxxx)").
export class CadastroMinimoNomeProvisorio1783500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "pacientes" ALTER COLUMN "cpf" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "pacientes" ALTER COLUMN "idade" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "pacientes" ALTER COLUMN "sexo" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "pacientes" ADD "nome_provisorio" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "fila_pacientes" ALTER COLUMN "idade" DROP NOT NULL`);
  }

  // Não inventa valores: se já houver cadastro sem CPF, idade ou sexo, a reversão para ao encontrá-lo.
  public async down(queryRunner: QueryRunner): Promise<void> {
    const [{ n }] = await queryRunner.query(
      `SELECT (SELECT COUNT(*) FROM "pacientes" WHERE "cpf" IS NULL OR "idade" IS NULL OR "sexo" IS NULL)
            + (SELECT COUNT(*) FROM "fila_pacientes" WHERE "idade" IS NULL) AS n`,
    );
    if (Number(n) > 0) {
      throw new Error(
        `Reversão recusada: ${n} registro(s) sem CPF, idade ou sexo. Complete ou remova esses cadastros antes de reverter (nenhum valor é inventado).`,
      );
    }
    await queryRunner.query(`ALTER TABLE "fila_pacientes" ALTER COLUMN "idade" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "pacientes" DROP COLUMN "nome_provisorio"`);
    await queryRunner.query(`ALTER TABLE "pacientes" ALTER COLUMN "sexo" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "pacientes" ALTER COLUMN "idade" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "pacientes" ALTER COLUMN "cpf" SET NOT NULL`);
  }
}
