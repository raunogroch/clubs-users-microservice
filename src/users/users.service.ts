import { Inject, Injectable } from '@nestjs/common';
import {
  CreateUserDto,
  UploadImageDto,
  UploadDniDto,
  UpdateStatusDto,
  UpdateUserDto,
  UpdatePasswordDto,
} from './dto';
import { NATS_SERVICE } from '../config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PaginationDto, Roles } from '../common';
import * as bcrypt from 'bcrypt';
import type { UserRoleValidation } from './interfaces';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
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
      const rolesToCreate = Array.from(
        new Set(
          createUserDto.roles && createUserDto.roles.length
            ? createUserDto.roles
            : [Roles.ATHLETE],
        ),
      );

      const { roles, password, ...userFields } = createUserDto;

      const createdUser = await this.usersRepository.create({
        ...userFields,
        password: hashedPassword,
        roles: {
          create: rolesToCreate.map((role) => ({ role })),
        },
      });

      return createdUser;
    } catch (err: any) {
      throw new RpcException(err);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    try {
      const { page = 1, limit = 10, role, search } = paginationDto;

      const whereCondition: any = {
        available: true,
      };

      if (role) {
        whereCondition.roles = {
          some: {
            role: role,
          },
        };
      }

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

      const totalPage =
        await this.usersRepository.countByCondition(whereCondition);

      const lastPage = Math.ceil(totalPage / limit);

      return {
        data: await this.usersRepository.findAll(page, limit, whereCondition),
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

      return this.usersRepository.update(id, {
        ...data,
        roles: updateUserDto.roles
          ? {
              deleteMany: {},
              create: rolesToCreate.map((role) => ({
                role,
              })),
            }
          : undefined,
      });
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
      const admins = await this.usersRepository.validateAdmins(
        data.ids,
        data.role,
      );
      return admins.map((admin) => admin.id);
    } catch (err: any) {
      throw new RpcException(err);
    }
  }

  async addingAssignment(data: { userId: string; assignmentId: string }) {
    try {
      const { userId, assignmentId } = data;

      const userExist = await this.usersRepository.findByIdBasic(userId);

      if (!userExist) {
        throw new RpcException({ message: 'User not found' });
      }

      await this.usersRepository.createUserAssignment(userId, assignmentId);

      return { message: 'Assignment added to user successfully' };
    } catch (err: any) {
      throw new RpcException(err);
    }
  }

  async removeAssignment(data: { userId: string; assignmentId: string }) {
    try {
      const { userId, assignmentId } = data;

      const userExist = await this.usersRepository.findByIdBasic(userId);

      if (!userExist) {
        throw new RpcException({ message: 'User not found' });
      }

      const assignment = await this.usersRepository.findUserAssignment(
        userId,
        assignmentId,
      );

      if (!assignment) {
        throw new RpcException({ message: 'Assignment not found' });
      }

      await this.usersRepository.deleteUserAssignment(assignment.id);

      return { message: 'Assignment removed from user successfully' };
    } catch (err: any) {
      throw new RpcException(err);
    }
  }
}
