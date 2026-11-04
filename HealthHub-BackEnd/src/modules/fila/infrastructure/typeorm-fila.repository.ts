import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Paciente } from '../../patients/domain/paciente.entity';
import { Visita } from '../../visitas/domain/visita.entity';
import { FilaPaciente } from '../domain/fila-paciente.entity';
import { IFilaRepository } from '../domain/fila-repository.interface';

@Injectable()
export class TypeormFilaRepository implements IFilaRepository {
  constructor(
    @InjectRepository(FilaPaciente)
    private readonly repo: Repository<FilaPaciente>,
    private readonly dataSource: DataSource,
  ) {}

  // Junta, só na leitura, a marca "nome provisório" do cadastro (a esteira guarda cópia de nome e idade, não dessa marca)
  async findAll(): Promise<FilaPaciente[]> {
    const { entities, raw } = await this.repo
      .createQueryBuilder('f')
      .leftJoin(Paciente, 'p', 'p.id = f.paciente_id')
      .addSelect('p.nome_provisorio', 'p_nome_provisorio')
      .orderBy('f.created_at', 'ASC')
      .getRawAndEntities();
    return entities.map((e, i) => Object.assign(e, { nome_provisorio: raw[i]?.p_nome_provisorio === true }));
  }

  findById(id: string): Promise<FilaPaciente | null> {
    return this.repo.findOneBy({ id });
  }

  findByPacienteId(pacienteId: string): Promise<FilaPaciente | null> {
    return this.repo.findOneBy({ paciente_id: pacienteId });
  }

  async createAndSave(data: Partial<FilaPaciente>): Promise<FilaPaciente> {
    const entrada = this.repo.create(data);
    await this.repo.save(entrada);
    return entrada;
  }

  async admitirAtomico(data: Partial<FilaPaciente>, motivoVisita?: string): Promise<FilaPaciente> {
    const JA_NA_FILA = { error: 'Paciente já está na fila de atendimento.' };
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Serializa as admissões: a leitura do maior PR-NNN e a gravação não se intercalam entre transações.
        await manager.query(`SELECT pg_advisory_xact_lock(hashtext('fila_admissao'))`);

        if (await manager.findOneBy(FilaPaciente, { paciente_id: data.paciente_id })) throw new ConflictException(JA_NA_FILA);

        const [{ proxima }] = await manager.query(
          `SELECT COALESCE(MAX(substring(senha from '^PR-([0-9]+)$')::int), 0) + 1 AS proxima FROM fila_pacientes`,
        );
        const senha = `PR-${String(proxima).padStart(3, '0')}`;

        const entrada = await manager.save(manager.create(FilaPaciente, { ...data, senha }));

        // Abre automaticamente uma visita ao admitir (reaproveita a ativa, se houver)
        const ativa = await manager.findOne(Visita, { where: { paciente_id: data.paciente_id, alta: IsNull(), desfecho: 'Em Atendimento' } });
        if (!ativa) {
          await manager.save(manager.create(Visita, { paciente_id: data.paciente_id, chegada: new Date(), desfecho: 'Em Atendimento', motivo_visita: motivoVisita }));
        }

        // Readmissão (resgate) reativa o paciente
        await manager.update(Paciente, { id: data.paciente_id }, { ativo: true });
        return entrada;
      });
    } catch (e) {
      // Índice único em fila_pacientes(paciente_id): violação = outra admissão do mesmo paciente venceu a corrida
      if ((e as { code?: string })?.code === '23505') throw new ConflictException(JA_NA_FILA);
      throw e;
    }
  }

  save(entrada: FilaPaciente): Promise<FilaPaciente> {
    return this.repo.save(entrada);
  }

  async remove(entrada: FilaPaciente): Promise<void> {
    await this.repo.remove(entrada);
  }
}
