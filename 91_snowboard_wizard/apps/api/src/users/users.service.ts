// users.service.ts - User upsert logic (create on first login, update name/avatar on repeat)
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserEntity } from '../entities/user.entity'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async upsertFromGoogle(
    googleId: string,
    email: string,
    name: string | null,
    avatarUrl: string | null,
  ): Promise<UserEntity> {
    const existing = await this.repo.findOne({ where: { googleId } })
    if (existing) {
      existing.name = name
      existing.avatarUrl = avatarUrl
      return this.repo.save(existing)
    }
    return this.repo.save({ googleId, email, name, avatarUrl })
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id } })
  }
}
