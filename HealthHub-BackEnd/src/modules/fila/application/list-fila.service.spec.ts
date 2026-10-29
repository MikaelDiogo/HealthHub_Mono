import { describe, it, expect } from 'vitest';
import { FilaPaciente } from '../domain/fila-paciente.entity';
import { ordenarPorManchesterEChegada } from './list-fila.service';

function entrada(id: string, gravidade: string | undefined, created_at: string): FilaPaciente {
  return {
    id,
    paciente_id: `pac-${id}`,
    nome: `Paciente ${id}`,
    idade: 30,
    senha: `S-${id}`,
    chegada: created_at,
    status: gravidade ? 'Aguardando Atendimento' : 'Aguardando Triagem',
    gravidade,
    created_at: new Date(created_at),
  } as FilaPaciente;
}

describe('ordenarPorManchesterEChegada', () => {
  it('ordena por categoria de Manchester: vermelho → laranja → amarelo → verde → azul', () => {
    const fila = [
      entrada('1', 'Azul', '2026-01-01T10:00:00'),
      entrada('2', 'Vermelho', '2026-01-01T10:05:00'),
      entrada('3', 'Verde', '2026-01-01T10:02:00'),
      entrada('4', 'Amarelo', '2026-01-01T10:03:00'),
      entrada('5', 'Laranja', '2026-01-01T10:04:00'),
    ];

    const ordenado = ordenarPorManchesterEChegada(fila).map((e) => e.id);
    expect(ordenado).toEqual(['2', '5', '4', '3', '1']);
  });

  it('na mesma categoria, desempata por ordem de chegada (mais antigo primeiro)', () => {
    const fila = [
      entrada('1', 'Vermelho', '2026-01-01T12:00:00'), // chegou depois
      entrada('2', 'Vermelho', '2026-01-01T10:00:00'), // chegou primeiro
      entrada('3', 'Vermelho', '2026-01-01T11:00:00'),
    ];

    const ordenado = ordenarPorManchesterEChegada(fila).map((e) => e.id);
    expect(ordenado).toEqual(['2', '3', '1']);
  });

  it('pacientes sem classificação ficam DEPOIS de todos os classificados (nunca à frente do Vermelho), em ordem de chegada', () => {
    const fila = [
      entrada('1', 'Azul', '2026-01-01T09:00:00'),
      entrada('2', undefined, '2026-01-01T08:30:00'),
      entrada('3', undefined, '2026-01-01T08:00:00'),
      entrada('4', 'Vermelho', '2026-01-01T09:30:00'),
    ];

    const ordenado = ordenarPorManchesterEChegada(fila).map((e) => e.id);
    expect(ordenado).toEqual(['4', '1', '3', '2']);
  });

  it('não modifica o array original (retorna uma nova lista)', () => {
    const fila = [entrada('1', 'Azul', '2026-01-01T10:00:00'), entrada('2', 'Vermelho', '2026-01-01T10:00:00')];
    const original = [...fila];
    ordenarPorManchesterEChegada(fila);
    expect(fila).toEqual(original);
  });
});
