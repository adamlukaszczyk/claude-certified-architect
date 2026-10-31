// wizard-session.entity.ts - Wizard progress (guest or authenticated)
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import type { Answers, PartialScores } from '@snowboard/types'
import { UserEntity } from './user.entity'

@Entity('wizard_sessions')
export class WizardSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'user_id', nullable: true, type: 'uuid' })
  userId!: string | null

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity | null

  @Column({ nullable: true, type: 'text' })
  name!: string | null

  @Column({ type: 'jsonb', default: '{}' })
  answers!: Answers

  @Column({ type: 'jsonb', nullable: true })
  scores!: PartialScores | null

  @Column({ name: 'schema_version', default: 1 })
  schemaVersion!: number

  @Column({ name: 'phase_reached', default: 1 })
  phaseReached!: number

  @Column({ name: 'completed_at', nullable: true, type: 'timestamptz' })
  completedAt!: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
