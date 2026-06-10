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
      include: { assignments: true, roles: true },
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
      include: { assignments: true, roles: true },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id, available: true },
      include: { assignments: true, roles: true },
    });
  }

  update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data,
      include: { assignments: true, roles: true },
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
    return this.prisma.user.findMany({
      where: {
        id: { in: uniqueIds },
        available: true,
        roles: {
          some: {
            role: role,
          },
        },
      },
      select: { id: true },
    });
  }

  findUserAssignment(userId: string, assignmentId: string) {
    return this.prisma.userAssignment.findFirst({
      where: { userId, assignmentId },
    });
  }

  createUserAssignment(userId: string, assignmentId: string) {
    return this.prisma.userAssignment.create({
      data: {
        userId,
        assignmentId,
      },
    });
  }

  deleteUserAssignment(id: string) {
    return this.prisma.userAssignment.delete({
      where: { id },
    });
  }
}
