import { Injectable } from '@nestjs/common';
import {
  CreateUserDto,
  UploadImageDto,
  UploadDniDto,
  UpdateStatusDto,
  UpdateUserDto,
  UpdatePasswordDto,
} from './dto';
import { RpcException } from '@nestjs/microservices';
import { PaginationDto, Roles } from '../common';
import * as bcrypt from 'bcrypt';
import type { UserRoleValidation } from './interfaces';
import { UsersRepository } from './users.repository';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const userExist = await this.usersRepository.findByUsername(
        createUserDto.username,
      );

      if (userExist) {
        throw new RpcException({ message: 'Username already exists' });
      }

      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      const { memberships, password, ...userFields } = createUserDto;

      const createdUser = await this.usersRepository.createWithMemberships(
        {
          ...userFields,
          password: hashedPassword,
        },
        (memberships || []).map((membership) => ({
          assignmentId: membership.assignmentId || null,
          role: membership.role as any,
          status: membership.status as any,
        })),
      );

      return this.formatUserResponse(createdUser);
    } catch (err: any) {
      throw new RpcException(err);
    }
  }

  private formatUserResponse(user: any) {
    const { userMemberships, password, available, ...userData } = user;
    return {
      ...userData,
      ...(userMemberships &&
        userMemberships.length > 0 && {
          memberships: userMemberships.map((m) => ({
            assignmentId: m.assignmentId,
            role: m.role,
            status: m.status,
          })),
        }),
    };
  }

  async findAll(paginationDto: PaginationDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        role,
        assignmentId,
      } = paginationDto;

      const whereCondition: any = {
        available: true,
      };

      if (search) {
        whereCondition.OR = [
          { username: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { lastname: { contains: search, mode: 'insensitive' } },
          { dni: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (role) {
        whereCondition.userMemberships = {
          some: {
            role: role as any,
            assignmentId: assignmentId,
            status: 'ACTIVE',
          },
        };
      }

      const totalPage =
        await this.usersRepository.countByCondition(whereCondition);

      const lastPage = Math.ceil(totalPage / limit);

      const users = await this.usersRepository.findAll(
        page,
        limit,
        whereCondition,
      );
      const formattedUsers = users.map((user) => this.formatUserResponse(user));

      return {
        data: formattedUsers,
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
    const userExist = await this.usersRepository.findById(id);

    if (!userExist) {
      throw new RpcException({ message: 'User not found' });
    }

    return {
      user: this.formatUserResponse(userExist),
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const { id: __, password: ___, memberships, ...data } = updateUserDto;
      await this.findOne(id);

      const updatedUser = await this.usersRepository.update(id, data);

      if (memberships && memberships.length > 0) {
        await this.usersRepository.replaceUserMemberships(
          id,
          memberships.map((membership) => ({
            assignmentId: membership.assignmentId || null,
            role: membership.role as any,
            status: membership.status as any,
          })),
        );

        const finalUser = await this.usersRepository.findById(id);
        return this.formatUserResponse(finalUser);
      }

      return this.formatUserResponse(updatedUser);
    } catch (err: any) {
      throw new RpcException(err);
    }
  }

  async remove(id: string) {
    const userExist = await this.usersRepository.findByIdBasic(id);

    if (!userExist) {
      throw new RpcException({ message: 'User not found' });
    }

    await this.usersRepository.softDelete(id);
    return { message: 'User removed successfully' };
  }

  async uploadImage(uploadImageDto: UploadImageDto) {
    return uploadImageDto;
  }

  async uploadDni(uploadDniDto: UploadDniDto) {
    return uploadDniDto;
  }

  async changeStatus(id: string, updateStatusDto: UpdateStatusDto) {
    const userExist = await this.usersRepository.findByIdBasic(id);

    if (!userExist) {
      throw new RpcException({ message: 'User not found' });
    }

    return await this.usersRepository.updateStatus(id, updateStatusDto.status);
  }

  async updatePassword(id: string, updatePasswordDto: UpdatePasswordDto) {
    try {
      const userExist = await this.usersRepository.findByIdBasic(id);

      if (!userExist) {
        throw new RpcException({
          message: 'User not found',
        });
      }

      const hashedPassword = await bcrypt.hashSync(
        updatePasswordDto.password,
        10,
      );

      await this.usersRepository.updatePassword(id, hashedPassword);

      return {
        message: 'Password updated successfully',
      };
    } catch (err: any) {
      throw new RpcException(err.message || 'Error updating password');
    }
  }

  async validateAdmins(data: UserRoleValidation) {
    try {
      const admins = await this.usersRepository.validateUserMembershipByRole(
        data.ids,
        data.role,
      );
      return admins.map((admin) => admin.userId);
    } catch (err: any) {
      throw new RpcException(err);
    }
  }

  async addingAssignment(data: {
    userId: string;
    assignmentId: string;
    role: Roles;
  }) {
    try {
      const { userId, assignmentId, role } = data;

      const userExist = await this.usersRepository.findByIdBasic(userId);

      if (!userExist) {
        throw new RpcException({
          message: 'User not found',
        });
      }

      // Verificar si ya existe exactamente esa relación
      const existingMembership = await this.usersRepository.findUserMembership(
        userId,
        role,
        assignmentId,
      );

      if (existingMembership) {
        return {
          message: 'Assignment already assigned',
        };
      }

      // Buscar rol existente sin assignment
      const emptyMembership = await this.usersRepository.findEmptyMembership(
        userId,
        role,
      );

      // Si existe ADMIN con assignmentId = null
      // reutilizarlo en vez de crear uno nuevo
      if (emptyMembership) {
        await this.usersRepository.updateMembershipAssignment(
          emptyMembership.id,
          assignmentId,
        );

        return {
          message: 'Assignment linked to existing role',
        };
      }

      // Si no existe un ADMIN vacío,
      // crear nuevo registro ADMIN + assignment
      await this.usersRepository.createUserMembership(
        userId,
        assignmentId,
        role,
      );

      return {
        message: 'Assignment added to user successfully',
      };
    } catch (err: any) {
      throw new RpcException(err);
    }
  }

  async removeAssignment(data: {
    userId: string;
    assignmentId: string;
    role: Roles;
  }) {
    try {
      const { userId, assignmentId, role } = data;

      const userExist = await this.usersRepository.findByIdBasic(userId);
      if (!userExist) {
        throw new RpcException({ message: 'User not found' });
      }

      // Delete all memberships for this user-assignment combo
      await this.usersRepository.deleteUserMembership(
        userId,
        assignmentId,
        role,
      );

      return { message: 'Assignment removed from user successfully' };
    } catch (err: any) {
      throw new RpcException(err);
    }
  }
}
