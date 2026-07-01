import { Injectable } from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/jwt-payload.interfaces';
import { Roles } from '../common';
import { envs } from '../config';
import { AuthRepository } from './auth.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    try {
      const existingUser = await this.authRepository.findByUsername(
        registerDto.username,
      );
      if (existingUser) {
        throw new RpcException('Username already exists');
      }

      const { memberships, ...userData } = registerDto;

      const createdUser = await this.authRepository.createWithMemberships(
        {
          name: userData.name,
          lastname: userData.lastname,
          username: userData.username,
          password: await bcrypt.hash(userData.password, 10),
          status: userData.status,
        },
        (memberships || []).map((membership) => ({
          assignmentId: membership.assignmentId || null,
          role: membership.role as any,
          status: membership.status,
        })),
      );

      const userMemberships = createdUser.userMemberships || [];
      const jwtRoles = userMemberships.map((membership) => membership.role);

      return {
        user: {
          id: createdUser.id,
          name: createdUser.name,
          lastname: createdUser.lastname,
          username: createdUser.username,
        },
        ...(userMemberships.length > 0 && {
          memberships: userMemberships.map((membership) => ({
            assignmentId: membership.assignmentId,
            role: membership.role,
            status: membership.status,
          })),
        }),
        token: await this.signJWT({
          id: createdUser.id,
          name: createdUser.name || '',
          lastname: createdUser.lastname || '',
          username: createdUser.username,
          roles: jwtRoles,
        }),
      };
    } catch (err: any) {
      throw new RpcException({
        status: 500,
        message: err.message,
      });
    }
  }

  async login(loginDto: LoginDto) {
    const existingUser =
      await this.authRepository.findByUsernameWithMemberships(
        loginDto.username,
      );
    if (!existingUser) {
      throw new RpcException({
        status: 400,
        message: 'Credentials are not valid',
      });
    }

    const isPasswordValid = await bcrypt.compareSync(
      loginDto.password,
      existingUser.password,
    );
    if (!isPasswordValid) {
      throw new RpcException({
        status: 400,
        message: 'Credentials are not valid',
      });
    }

    if (existingUser.status === 'INACTIVE') {
      throw new RpcException({
        status: 403,
        message: 'User is inactive',
      });
    }

    const memberships = existingUser.userMemberships || [];
    const jwtRoles = memberships.map((m) => m.role);

    return {
      user: {
        id: existingUser.id,
        name: existingUser.name,
        lastname: existingUser.lastname,
        username: existingUser.username,
      },
      ...(memberships.length > 0 && {
        memberships: memberships.map((m) => ({
          assignmentId: m.assignmentId,
          role: m.role,
          status: m.status,
        })),
      }),
      token: await this.signJWT({
        id: existingUser.id,
        name: existingUser.name || '',
        lastname: existingUser.lastname || '',
        username: existingUser.username,
        roles: jwtRoles,
      }),
    };
  }

  async selectContext(userId: string, role: string, assignmentId?: string) {
    try {
      const roleEnum = role as any;
      const isGlobalRole = [Roles.SUPER_ADMIN, Roles.ADMIN].includes(roleEnum);

      if (!isGlobalRole && !assignmentId) {
        throw new RpcException({
          status: 400,
          message: `assignmentId is required for role ${role}`,
        });
      }

      const membership = await this.authRepository.findActiveMembership(
        userId,
        roleEnum,
        assignmentId,
      );

      if (!membership) {
        throw new RpcException({
          status: 403,
          message: `User does not have ${role} role${assignmentId ? ` in assignment ${assignmentId}` : ' (global)'}`,
        });
      }

      const user = await this.authRepository.findById(userId);

      if (!user) {
        throw new RpcException({
          status: 404,
          message: 'User not found',
        });
      }

      const jwtPayload: any = {
        sub: user.id,
        username: user.username,
        name: user.name || '',
        lastname: user.lastname || '',
        role,
      };

      if (assignmentId) {
        jwtPayload.assignmentId = assignmentId;
      }

      return {
        token: this.jwtService.sign(jwtPayload),
      };
    } catch (err: any) {
      if (err instanceof RpcException) {
        throw err;
      }
      throw new RpcException({
        status: 500,
        message: err.message || 'Error selecting context',
      });
    }
  }

  async signJWT(jwtPayload: JwtPayload): Promise<string> {
    return this.jwtService.sign(jwtPayload);
  }

  async verifyToken(token: string) {
    try {
      const { sub, iat, exp, ...user } = this.jwtService.verify(token, {
        secret: envs.jwtSecret,
      });

      return {
        user,
        token: await this.signJWT(user),
      };
    } catch (err) {
      throw new RpcException({
        status: 401,
        message: 'Invalid token',
      });
    }
  }
}
