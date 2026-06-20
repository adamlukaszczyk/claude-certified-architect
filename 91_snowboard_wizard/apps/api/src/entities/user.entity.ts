// user.entity.ts - Registered users (created on first Google login)
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'google_id', unique: true })
  googleId!: string

  @Column({ unique: true })
  email!: string

  @Column({ nullable: true, type: 'text' })
  name!: string | null

  @Column({ name: 'avatar_url', nullable: true, type: 'text' })
  avatarUrl!: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
