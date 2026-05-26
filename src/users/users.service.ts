import { Inject, Injectable } from '@nestjs/common';
import {
  CreateUserDto,
  UploadImageDto,
  UploadDniDto,
  UpdateStatusDto,
  UpdateUserDto,
  UpdatePasswordDto,
} from './dto';
import { PrismaPg } from '@prisma/adapter-pg';
import { envs, NATS_SERVICE } from '../config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PrismaClient } from '../generated/prisma/client';
import { PaginationDto, Roles } from '../common';
import * as bcrypt from 'bcrypt';
import type { UserRoleValidation } from './interfaces';

@Injectable()
export class UsersService extends PrismaClient {
  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {
    const adapter = new PrismaPg(envs.databaseUrl);
    super({ adapter });
  }

  async create(createUserDto: CreateUserDto) {
    try {
      const userExist = await this.user.findUnique({
        where: { username: createUserDto.username },
      });

      if (userExist) {
        throw new RpcException({ message: 'Username already exists' });
      }

      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      const rolesToCreate = Array.from(
        new Set(
          createUserDto.roles && createUserDto.roles.length
            ? createUserDto.roles
            : [Roles.ATHLETE],
        ),
      );

      const { roles, password, ...userFields } = createUserDto;

      const createdUser = await this.user.create({
        data: {
          ...userFields,
          password: hashedPassword,
          roles: {
            create: rolesToCreate.map((role) => ({ role })),
          },
        },
        include: { assignments: true, roles: true },
      });

      return createdUser;
    } catch (err: any) {
      throw new RpcException(err);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const totalPage = await this.user.count({
        where: { available: true },
      });

      const lastPage = Math.ceil(totalPage / limit);

      return {
        data: await this.user.findMany({
          skip: (page - 1) * limit,
          take: limit,
          where: { available: true },
          include: { assignments: true },
        }),
        meta: {
          total: totalPage,
          page: page,
          lastPage: lastPage,
        },
      };
    } catch (err: any) {
      throw new RpcException(err);
    }
  }

  async findOne(id: string) {
    const userExist = await this.user.findUnique({
      where: { id: id, available: true },
      include: { assignments: true, roles: true },
    });

    if (!userExist) {
      throw new RpcException({ message: 'User not found' });
    }

    const { password, createdAt, updatedAt, ...userNew } = userExist;
    return {
      user: userNew,
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const rolesToCreate = Array.from(
        new Set(
          updateUserDto.roles?.length ? updateUserDto.roles : [Roles.ATHLETE],
        ),
      );
      const { id: __, password: ___, ...data } = updateUserDto;
      await this.findOne(id);

      return this.user.update({
        where: { id },
        data: {
          ...data,
          roles: updateUserDto.roles
            ? {
                deleteMany: {},
                create: rolesToCreate.map((role) => ({
                  role,
                })),
              }
            : undefined,
        },
        include: { assignments: true, roles: true },
      });
    } catch (err: any) {
      throw new RpcException(err);
    }
  }

  async remove(id: string) {
    const userExist = await this.user.findUnique({
      where: { id },
    });

    if (!userExist) {
      throw new RpcException({ message: 'User not found' });
    }

    await this.user.update({
      where: { id },
      data: { available: false },
    });
    return { message: 'User removed successfully' };
  }

  async uploadImage(uploadImageDto: UploadImageDto) {
    return uploadImageDto;
  }

  async uploadDni(uploadDniDto: UploadDniDto) {
    return uploadDniDto;
  }

  async changeStatus(id: string, updateStatusDto: UpdateStatusDto) {
    const userExist = await this.user.findUnique({
      where: { id },
    });

    if (!userExist) {
      throw new RpcException({ message: 'User not found' });
    }

    return await this.user.update({
      where: { id },
      data: { status: updateStatusDto.status },
      select: { id: true, status: true },
    });
  }

  async updatePassword(id: string, updatePasswordDto: UpdatePasswordDto) {
    try {
      const userExist = await this.user.findUnique({
        where: { id },
      });

      if (!userExist) {
        throw new RpcException({
          message: 'User not found',
        });
      }

      const hashedPassword = await bcrypt.hashSync(
        updatePasswordDto.password,
        10,
      );

      await this.user.update({
        where: { id },
        data: {
          password: hashedPassword,
        },
      });

      return {
        message: 'Password updated successfully',
      };
    } catch (err: any) {
      throw new RpcException(err.message || 'Error updating password');
    }
  }

  async validateAdmins(data: UserRoleValidation) {
    try {
      const uniqueIds = Array.from(new Set(data.ids));
      const admins = await this.user.findMany({
        where: {
          id: { in: uniqueIds },
          available: true,
          roles: {
            some: {
              role: data.role,
            },
          },
        },
        select: { id: true },
      });
      return admins.map((admin) => admin.id);
    } catch (err: any) {
      throw new RpcException(err);
    }
  }

  async addingAssignment(data: { userId: string; assignmentId: string }) {
    try {
      const { userId, assignmentId } = data;

      const userExist = await this.user.findUnique({
        where: { id: userId },
      });

      if (!userExist) {
        throw new RpcException({ message: 'User not found' });
      }

      await this.userAssignment.create({
        data: {
          userId: userId,
          assignmentId: assignmentId,
        },
      });

      return { message: 'Assignment added to user successfully' };
    } catch (err: any) {
      throw new RpcException(err);
    }
  }

  async removeAssignment(data: { userId: string; assignmentId: string }) {
    try {
      const { userId, assignmentId } = data;

      const userExist = await this.user.findUnique({
        where: { id: userId },
      });

      if (!userExist) {
        throw new RpcException({ message: 'User not found' });
      }

      const assignment = await this.userAssignment.findFirst({
        where: { userId, assignmentId },
      });

      if (!assignment) {
        throw new RpcException({ message: 'Assignment not found' });
      }

      await this.userAssignment.delete({
        where: { id: assignment.id },
      });

      return { message: 'Assignment removed from user successfully' };
    } catch (err: any) {
      throw new RpcException(err);
    }
  }
}
