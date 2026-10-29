import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Tipos de evento registrados hoje. São ações do sistema, não categorias de protocolo clínico.
export const TIPOS_EVENTO = [
  'admitido',
  'sinais_registrados',
  'triagem_iniciada',
  'classificado',
  'consulta_iniciada', // hoje "Chamar" já inicia a consulta: chamada e início da consulta são o mesmo evento
  'observacao_iniciada',
  'status_alterado',
  'alta',
  'removido_da_fila',
] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

@Entity('fila_eventos')
export class FilaEvento {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  paciente_id!: string;

  @Column('uuid', { nullable: true })
  visita_id?: string | null;

  @Column('uuid', { nullable: true })
  fila_id?: string | null;

  @Column('varchar', { length: 40 })
  tipo!: string;

  @Column('varchar', { length: 50, nullable: true })
  status_anterior?: string | null;

  @Column('varchar', { length: 50, nullable: true })
  status_novo?: string | null;

  /** Cor escolhida manualmente pelo enfermeiro; o sistema não a calcula nem a sugere. */
  @Column('varchar', { length: 50, nullable: true })
  gravidade?: string | null;

  @Column('text', { nullable: true })
  justificativa?: string | null;

  @Column('uuid', { nullable: true })
  usuario_id?: string | null;

  @Column('varchar', { length: 20, nullable: true })
  usuario_role?: string | null;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em!: Date;
}
