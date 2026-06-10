import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUsername(username: string) {
    return this.prisma.user.findFirst({
      where: { username },
    });
  }

  findByUsernameWithRoles(username: string) {
    return this.prisma.user.findFirst({
      where: { username },
      include: { roles: true },
    });
  }

  create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({
      data,
      include: {
        roles: true,
      },
    });
  }
}
