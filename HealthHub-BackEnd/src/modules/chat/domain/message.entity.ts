import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Conversation } from './conversation.entity';

export type MessagePriority = 'normal' | 'urgente';

/** Mensagens são IMUTÁVEIS — não existe update/delete (rastro clínico auditável). */
@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  conversation_id!: string;

  @Column('uuid')
  sender_id!: string;

  @Column('varchar')
  sender_nome!: string;

  @Column('varchar')
  sender_role!: string;

  @Column('text')
  content!: string;

  @Column('varchar', { default: 'normal' })
  priority!: MessagePriority;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation!: Conversation;
}
