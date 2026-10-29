import { Inject, Injectable } from '@nestjs/common';
import { FilaPaciente } from '../domain/fila-paciente.entity';
import { FILA_REPOSITORY, IFilaRepository } from '../domain/fila-repository.interface';

// Protocolo de Manchester: vermelho é o mais urgente, azul o menos urgente.
// Quem ainda não foi classificado (sem gravidade) vem DEPOIS de todos os classificados,
// em ordem de chegada: um paciente sem cor nunca fica à frente de um Vermelho (RF09).
const GRAVIDADE_ORDER: Record<string, number> = {
  Vermelho: 1,
  Laranja: 2,
  Amarelo: 3,
  Verde: 4,
  Azul: 5,
};
const SEM_CLASSIFICACAO = 99;

export function ordenarPorManchesterEChegada(entradas: FilaPaciente[]): FilaPaciente[] {
  return [...entradas].sort((a, b) => {
    const rankA = a.gravidade ? (GRAVIDADE_ORDER[a.gravidade] ?? SEM_CLASSIFICACAO) : SEM_CLASSIFICACAO;
    const rankB = b.gravidade ? (GRAVIDADE_ORDER[b.gravidade] ?? SEM_CLASSIFICACAO) : SEM_CLASSIFICACAO;
    if (rankA !== rankB) return rankA - rankB;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

@Injectable()
export class ListFilaService {
  constructor(
    @Inject(FILA_REPOSITORY)
    private readonly filaRepository: IFilaRepository,
  ) {}

  async execute(): Promise<FilaPaciente[]> {
    const entradas = await this.filaRepository.findAll();
    return ordenarPorManchesterEChegada(entradas);
  }
}
