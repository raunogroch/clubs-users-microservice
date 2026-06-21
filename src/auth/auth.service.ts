import { Inject, Injectable } from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto';
import { NATS_SERVICE, envs } from '../config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/jwt-payload.interfaces';
import { Roles } from '../common';
import { AuthRepository } from './auth.repository';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly prisma: PrismaService,
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
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

      const userNew = await this.authRepository.create({
        name: userData.name,
        lastname: userData.lastname,
        username: userData.username,
        password: await bcrypt.hashSync(userData.password, 10),
        status: userData.status,
      });

      // Create memberships if provided
      let userMemberships: any[] = [];
      let jwtRoles: string[] = [];

      if (memberships && memberships.length > 0) {
        for (const membership of memberships) {
          // Use provided assignmentId or null if not provided
          const assignmentId = membership.assignmentId || null;
          const status = membership.status || 'ACTIVE';

          const created = await this.prisma.userMembership.create({
            data: {
              userId: userNew.id,
              assignmentId,
              role: membership.role as any,
              status,
            },
          });
          userMemberships.push({
            assignmentId: created.assignmentId,
            role: created.role,
            status: created.status,
          });
          jwtRoles.push(created.role);
        }
      }

      return {
        user: {
          id: userNew.id,
          name: userNew.name,
          lastname: userNew.lastname,
          username: userNew.username,
        },
        ...(userMemberships.length > 0 && { memberships: userMemberships }),
        token: await this.signJWT({
          id: userNew.id,
          name: userNew.name || '',
          lastname: userNew.lastname || '',
          username: userNew.username,
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

    // Get user memberships (new model)
    const memberships = existingUser.userMemberships || [];
    const hasMemberships = memberships.length > 0;

    // Determine JWT roles: from memberships if available, otherwise from legacy roles
    const jwtRoles = hasMemberships
      ? memberships.map((m) => m.role)
      : existingUser.roles?.map((r) => r.role) || [];

    return {
      user: {
        id: existingUser.id,
        name: existingUser.name,
        lastname: existingUser.lastname,
        username: existingUser.username,
      },
      ...(hasMemberships && {
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
      // Validate role
      const roleEnum = role as any;
      const isGlobalRole = [Roles.SUPER_ADMIN, Roles.ADMIN].includes(roleEnum);

      // For non-global roles, assignmentId is required
      if (!isGlobalRole && !assignmentId) {
        throw new RpcException({
          status: 400,
          message: `assignmentId is required for role ${role}`,
        });
      }

      // Verify user has this membership
      const membership = await this.prisma.userMembership.findFirst({
        where: {
          userId,
          role: roleEnum,
          status: 'ACTIVE',
          ...(assignmentId && { assignmentId }),
          ...(!assignmentId && isGlobalRole && { assignmentId: null }),
        },
      });

      if (!membership) {
        throw new RpcException({
          status: 403,
          message: `User does not have ${role} role${assignmentId ? ` in assignment ${assignmentId}` : ' (global)'}`,
        });
      }

      // Get full user info
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new RpcException({
          status: 404,
          message: 'User not found',
        });
      }

      // Generate contextual JWT
      const jwtPayload: any = {
        sub: user.id,
        username: user.username,
        name: user.name || '',
        lastname: user.lastname || '',
        role,
      };

      // Include assignmentId only if provided
      if (assignmentId) {
        jwtPayload.assignmentId = assignmentId;
      }

      const contextualJwt = this.jwtService.sign(jwtPayload);

      return {
        token: contextualJwt,
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
