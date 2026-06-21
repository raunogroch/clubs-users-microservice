import { Injectable } from '@nestjs/common';
import { Prisma, $Enums } from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({
      data,
      include: { userMemberships: true },
    });
  }

  countByCondition(whereCondition: any) {
    return this.prisma.user.count({
      where: whereCondition,
    });
  }

  findAll(page: number, limit: number, whereCondition: any) {
    return this.prisma.user.findMany({
      skip: (page - 1) * limit,
      take: limit,
      where: whereCondition,
      include: { userMemberships: true },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id, available: true },
      include: { userMemberships: true },
    });
  }

  update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data,
      include: { userMemberships: true },
    });
  }

  findByIdBasic(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  softDelete(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { available: false },
    });
  }

  updateStatus(id: string, status: $Enums.UserStatus) {
    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    });
  }

  updatePassword(id: string, hashedPassword: string) {
    return this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  validateAdmins(ids: string[], role: $Enums.Role) {
    const uniqueIds = Array.from(new Set(ids));
    return this.validateUserMembershipByRole(uniqueIds, role);
  }



  // UserMembership operations (new canonical model)
  createUserMembership(
    userId: string,
    assignmentId: string | null,
    role: $Enums.Role,
    status: $Enums.MembershipStatus = 'ACTIVE',
  ) {
    return this.prisma.userMembership.create({
      data: {
        userId,
        assignmentId,
        role,
        status,
      },
    });
  }

  getUserMemberships(userId: string) {
    return this.prisma.userMembership.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
    });
  }

  getUserMembershipsByAssignment(userId: string, assignmentId: string) {
    return this.prisma.userMembership.findMany({
      where: {
        userId,
        assignmentId,
        status: 'ACTIVE',
      },
    });
  }

  // Validate users have a specific role (includes global roles for SUPER_ADMIN/ADMIN)
  validateUserMembershipByRole(ids: string[], role: $Enums.Role) {
    const uniqueIds = Array.from(new Set(ids));
    return this.prisma.userMembership.findMany({
      where: {
        userId: { in: uniqueIds },
        role,
        status: 'ACTIVE',
        // For global roles (SUPER_ADMIN, ADMIN), assignmentId can be null
        // For other roles, assignmentId must be present
      },
      select: { userId: true },
      distinct: ['userId'],
    });
  }

  deleteUserMemberships(userId: string, assignmentId: string) {
    return this.prisma.userMembership.deleteMany({
      where: {
        userId,
        assignmentId,
      },
    });
  }

  // Find membership with optional assignmentId (for global roles)
  findUserMembership(userId: string, role: $Enums.Role, assignmentId?: string) {
    const whereClause: any = {
      userId,
      role,
      status: 'ACTIVE',
    };

    if (assignmentId) {
      whereClause.assignmentId = assignmentId;
    }

    return this.prisma.userMembership.findFirst({
      where: whereClause,
    });
  }

  getUserWithMemberships(id: string) {
    return this.prisma.user.findUnique({
      where: { id, available: true },
      include: { userMemberships: true },
    });
  }
}
