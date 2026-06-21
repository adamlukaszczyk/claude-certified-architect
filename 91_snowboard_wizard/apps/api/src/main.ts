// main.ts - NestJS bootstrap
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  app.use(cookieParser())
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  const config = app.get(ConfigService)
  const allowedOrigins = config.get<string[]>('allowedOrigins') ?? []
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  })
  app.setGlobalPrefix('api')
  const port = process.env.PORT ?? 3001
  await app.listen(port)
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
