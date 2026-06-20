// recommendation.entity.ts - Final spec sheet + Claude narrative
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from 'typeorm'
import type { SpecSheet } from '@snowboard/types'
import { WizardSessionEntity } from './wizard-session.entity'

@Entity('recommendations')
export class RecommendationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'session_id', unique: true })
  sessionId!: string

  @OneToOne(() => WizardSessionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: WizardSessionEntity

  @Column({ name: 'spec_sheet', type: 'jsonb' })
  specSheet!: SpecSheet

  @Column({ name: 'claude_narrative', nullable: true, type: 'text' })
  claudeNarrative!: string | null

  @Column({ name: 'share_token', unique: true })
  shareToken!: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
