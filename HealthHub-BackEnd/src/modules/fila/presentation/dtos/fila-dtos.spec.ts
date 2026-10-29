import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateFilaDto } from './update-fila.dto';
import { CreateFilaDto } from './create-fila.dto';

const STATUS_ESTEIRA = ['Aguardando Triagem', 'Em Triagem (Enfermeiro)', 'Aguardando Atendimento', 'Em Consulta (Médico)', 'Em Observação'];
const CORES = ['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul'];

const erros = async (cls: any, obj: object) => (await validate(plainToInstance(cls, obj))).map((e) => e.property);

describe('UpdateFilaDto — status e gravidade só com valores que o sistema já usa', () => {
  it.each(STATUS_ESTEIRA)('aceita o status da esteira "%s"', async (status) => {
    expect(await erros(UpdateFilaDto, { status })).toEqual([]);
  });

  it('aceita "Alta" (a regra de quem pode dar alta fica no serviço)', async () => {
    expect(await erros(UpdateFilaDto, { status: 'Alta' })).toEqual([]);
  });

  it.each(['qualquer coisa', 'aguardando triagem', '', 'Cancelado'])('recusa o status fora da lista: "%s"', async (status) => {
    expect(await erros(UpdateFilaDto, { status })).toContain('status');
  });

  it.each(CORES)('aceita a gravidade "%s"', async (gravidade) => {
    expect(await erros(UpdateFilaDto, { status: 'Aguardando Atendimento', gravidade })).toEqual([]);
  });

  it('a gravidade continua opcional', async () => {
    expect(await erros(UpdateFilaDto, { status: 'Em Observação' })).toEqual([]);
  });

  it.each(['Roxo', 'vermelho', 'urgente', ''])('recusa a gravidade fora da lista: "%s"', async (gravidade) => {
    expect(await erros(UpdateFilaDto, { status: 'Aguardando Atendimento', gravidade })).toContain('gravidade');
  });
});

describe('CreateFilaDto — admissão só nos status de entrada na esteira', () => {
  const base = { paciente_id: '11111111-1111-4111-8111-111111111111', nome: 'TESTE A', idade: 34, senha: 'PR-001', chegada: '29/10/2026, 10:00' };

  it.each(STATUS_ESTEIRA)('aceita o status "%s"', async (status) => {
    expect(await erros(CreateFilaDto, { ...base, status })).toEqual([]);
  });

  it.each(['Alta', 'qualquer coisa', ''])('recusa o status "%s" na admissão', async (status) => {
    expect(await erros(CreateFilaDto, { ...base, status })).toContain('status');
  });
});

// Não prova: que as TRANSIÇÕES entre status são válidas (não existe mapa de transições: é regra clínica
// ainda não decidida); nem que o ValidationPipe global está ativo na aplicação (só o DTO é exercitado).
