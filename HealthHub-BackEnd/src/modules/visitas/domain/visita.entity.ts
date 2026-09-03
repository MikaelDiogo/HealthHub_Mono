import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Paciente } from '../../patients/domain/paciente.entity';

export type Desfecho = 'Em Atendimento' | 'Alta' | 'Internacao' | 'Transferencia' | 'Saida Voluntaria';
export type GravidadeMmanchester = 'Vermelho' | 'Laranja' | 'Amarelo' | 'Verde' | 'Azul';

@Entity('visitas')
export class Visita {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  paciente_id!: string;

  @ManyToOne(() => Paciente, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paciente_id' })
  paciente!: Paciente;

  @Column('timestamp', { default: () => 'now()' })
  chegada!: Date;

  @Column('timestamp', { nullable: true })
  alta?: Date;

  @Column('varchar', { nullable: true })
  gravidade_manchester?: string;

  @Column('text', { nullable: true })
  motivo_visita?: string;

  @Column('varchar', { default: 'Em Atendimento' })
  desfecho!: string;

  @Column('text', { nullable: true })
  observacoes?: string;

  @CreateDateColumn()
  created_at!: Date;
}
