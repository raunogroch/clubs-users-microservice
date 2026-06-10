import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { NatsModule } from '../transports/nats.module';
import { PrismaService } from '../prisma.service';
import { UsersRepository } from './users.repository';

@Module({
  imports: [NatsModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, PrismaService],
})
export class UsersModule {}
