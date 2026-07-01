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
    memberships: Array<{
      assignmentId: string | null;
      role: $Enums.Role;
      status?: $Enums.MembershipStatus;
    }>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: userData,
        include: { userMemberships: true },
      });

      if (memberships.length > 0) {
        await tx.userMembership.createMany({
          data: memberships.map((m) => ({
            userId: user.id,
            assignmentId: m.assignmentId,
            role: m.role,
            status: m.status || 'ACTIVE',
          })),
        });
      }

      return user;
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findActiveMembership(
    userId: string,
    role: $Enums.Role,
    assignmentId?: string,
  ) {
    const whereClause: any = {
      userId,
      role,
      status: 'ACTIVE',
    };

    if (assignmentId) {
      whereClause.assignmentId = assignmentId;
    } else {
      whereClause.assignmentId = null;
    }

    return this.prisma.userMembership.findFirst({
      where: whereClause,
    });
  }
}
