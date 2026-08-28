import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { ConversationParticipant } from './conversation-participant.entity';

export type ConversationType = 'direct' | 'group' | 'patient';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar')
  type!: ConversationType;

  @Column('varchar', { nullable: true })
  name?: string;

  @CreateDateColumn()
  created_at!: Date;

  @OneToMany(() => ConversationParticipant, (p) => p.conversation)
  participants!: ConversationParticipant[];
}
