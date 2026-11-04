import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Paciente } from '../domain/paciente.entity';
import { gerarNomeProvisorio } from '../domain/nome-provisorio';
import { IPatientsRepository, PATIENTS_REPOSITORY } from '../domain/patients-repository.interface';
import { CreatePatientDto } from '../presentation/dtos/create-patient.dto';

export const MSG_CPF_DUPLICADO = 'Um Paciente com esse CPF já está cadastrado no HealthHub';

@Injectable()
export class CreatePatientService {
  constructor(
    @Inject(PATIENTS_REPOSITORY)
    private readonly patientsRepository: IPatientsRepository,
  ) {}

  async execute(data: CreatePatientDto): Promise<Paciente> {
    const { nome_desconhecido, nome_completo, ...resto } = data;
    const desconhecido = nome_desconhecido === true;
    const cpf = resto.cpf || null;

    // CPF é opcional: só confere duplicidade quando foi informado (vários pacientes sem CPF são permitidos)
    if (cpf && (await this.patientsRepository.findByCpf(cpf))) {
      throw new BadRequestException({ error: MSG_CPF_DUPLICADO });
    }

    // O id é gerado aqui (e não pelo banco) para o nome provisório poder usá-lo antes da gravação
    const id = randomUUID();

    try {
      return await this.patientsRepository.createAndSave({
        ...resto,
        id,
        cpf,
        nome_completo: desconhecido ? gerarNomeProvisorio(id) : nome_completo,
        nome_provisorio: desconhecido,
      });
    } catch (e) {
      // Duas requisições com o mesmo CPF ao mesmo tempo: o índice único do banco decide
      if ((e as { code?: string })?.code === '23505') throw new BadRequestException({ error: MSG_CPF_DUPLICADO });
      throw e;
    }
  }
}
