import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type UserRole = 'medico' | 'recepcionista' | 'enfermeiro';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  nome!: string;

  @Column({ type: 'varchar', unique: true })
  email!: string;

  @Column({ type: 'varchar' })
  senha!: string;

  @Column({ type: 'varchar' })
  role!: UserRole;

  @CreateDateColumn()
  created_at!: Date;
}
