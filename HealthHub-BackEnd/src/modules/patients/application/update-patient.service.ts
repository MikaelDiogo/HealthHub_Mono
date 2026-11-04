import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { RealtimeGateway } from '../../../shared/realtime/realtime.gateway';
import { Paciente } from '../domain/paciente.entity';
import { IPatientsRepository, PATIENTS_REPOSITORY } from '../domain/patients-repository.interface';
import { UpdatePatientDto } from '../presentation/dtos/update-patient.dto';
import { MSG_CPF_DUPLICADO } from './create-patient.service';

@Injectable()
export class UpdatePatientService {
  constructor(
    @Inject(PATIENTS_REPOSITORY)
    private readonly patientsRepository: IPatientsRepository,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async execute(id: string, data: UpdatePatientDto): Promise<Paciente> {
    const patient = await this.patientsRepository.findById(id);

    if (!patient) {
      throw new BadRequestException({ error: 'Paciente não encontrado.' });
    }

    // nome_desconhecido só vale no cadastro; na edição o nome é sempre o que o usuário digitou
    const { nome_desconhecido: _ignorado, ...campos } = data;

    // O nome é o único campo obrigatório: não pode ser apagado na edição
    if (campos.nome_completo === null || (campos.nome_completo !== undefined && campos.nome_completo.trim() === '')) {
      throw new BadRequestException({ error: 'Nome completo é obrigatório (até 150 caracteres)' });
    }

    const nomeAnterior = patient.nome_completo;

    // Aplica apenas os campos presentes (partial update)
    for (const [key, value] of Object.entries(campos)) {
      if (value !== undefined) {
        (patient as unknown as Record<string, unknown>)[key] = value;
      }
    }

    // Gravar um nome diferente do provisório (o nome atual, enquanto a marca existir) tira a marca de "nome provisório"
    if (patient.nome_provisorio && campos.nome_completo !== undefined && campos.nome_completo !== nomeAnterior) {
      patient.nome_provisorio = false;
    }

    try {
      const { paciente, filaAtualizada } = await this.patientsRepository.saveSincronizandoFila(patient);
      // A esteira guarda uma cópia de nome e idade: se ela mudou, os clientes precisam recarregar
      if (filaAtualizada > 0) this.realtimeGateway.broadcastFilaChanged();
      return paciente;
    } catch (e) {
      if ((e as { code?: string })?.code === '23505') throw new BadRequestException({ error: MSG_CPF_DUPLICADO });
      throw e;
    }
  }
}
