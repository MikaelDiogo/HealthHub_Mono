import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Paciente } from '../../patients/domain/paciente.entity';

@Entity('sinais_vitais')
export class SinaisVitais {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  patient_id!: string;

  @Column('int')
  hora!: number;

  @Column('float', { nullable: true })
  frequencia_cardiaca?: number;

  @Column('float', { nullable: true })
  saturacao_oxigenio?: number;

  @Column('varchar', { nullable: true })
  pressao_arterial?: string;

  @Column('float', { nullable: true })
  temperatura?: number;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @ManyToOne(() => Paciente, (paciente) => paciente.sinaisVitais, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  paciente!: Paciente;
}
