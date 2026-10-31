// recommendations.controller.ts - POST/GET recommendations endpoints
import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus, NotFoundException, HttpException, UseGuards, ParseUUIDPipe } from '@nestjs/common'
import { RecommendationsService } from './recommendations.service'
import { CreateRecommendationDto } from './dto/create-recommendation.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRecommendationDto) {
    return this.service.create(dto.answers, null /* TODO(Task 7): extract userId from JWT claims */, dto.sessionName ?? null)
  }

  @Get('share/:token')
  async getByToken(@Param('token') token: string) {
    const rec = await this.service.findByShareToken(token)
    if (!rec) throw new NotFoundException('Recommendation not found')
    return rec
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getById(@Param('id', new ParseUUIDPipe()) id: string) {
    const rec = await this.service.findById(id)
    if (!rec) throw new NotFoundException('Recommendation not found')
    return rec
  }

  @Get(':id/pdf')
  getPdf() {
    throw new HttpException('PDF export not yet implemented', HttpStatus.NOT_IMPLEMENTED)
  }
}
