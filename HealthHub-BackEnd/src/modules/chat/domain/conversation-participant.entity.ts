import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from '../../auth/domain/user.entity';

@Entity('conversation_participants')
@Unique(['conversation_id', 'user_id'])
export class ConversationParticipant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  conversation_id!: string;

  @Column('uuid')
  user_id!: string;

  @Column('timestamp', { nullable: true })
  last_read_at?: Date;

  @CreateDateColumn({ name: 'joined_at' })
  joined_at!: Date;

  @ManyToOne(() => Conversation, (c) => c.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation!: Conversation;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
