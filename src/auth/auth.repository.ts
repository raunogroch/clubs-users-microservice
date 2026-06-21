import { Injectable } from '@nestjs/common';
import { Prisma, $Enums } from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUsername(username: string) {
    return this.prisma.user.findFirst({
      where: { username },
    });
  }

  findByUsernameWithMemberships(username: string) {
    return this.prisma.user.findFirst({
      where: { username },
      include: {
        userMemberships: { where: { status: 'ACTIVE' } },
        roles: true,
      },
    });
  }

  create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({
      data,
    });
  }

  createWithMemberships(
    userData: Prisma.UserCreateInput,
    memberships: Array<{ assignmentId: string; role: $Enums.Role }>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: userData,
        include: { userMemberships: true },
      });

      // Create UserMembership entries
      if (memberships.length > 0) {
        await tx.userMembership.createMany({
          data: memberships.map((m) => ({
            userId: user.id,
            assignmentId: m.assignmentId,
            role: m.role,
            status: 'ACTIVE',
          })),
        });
      }

      return user;
    });
  }
}
