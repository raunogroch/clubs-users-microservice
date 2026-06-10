import { Inject, Injectable } from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto';
import { NATS_SERVICE, envs } from '../config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/jwt-payload.interfaces';
import { Roles } from '../common';
import { AuthRepository } from './auth.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
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

      const rolesToCreate = Array.from(
        new Set(registerDto.roles ?? [Roles.ATHLETE]),
      );

      const userNew = await this.authRepository.create({
        name: registerDto.name,
        lastname: registerDto.lastname,
        username: registerDto.username,
        password: await bcrypt.hashSync(registerDto.password, 10),
        status: registerDto.status,
        roles: {
          create: rolesToCreate.map((role) => ({
            role,
          })),
        },
      });

      return {
        user: {
          id: userNew.id,
          name: userNew.name,
          lastname: userNew.lastname,
          username: userNew.username,
          roles: userNew.roles.map((role) => role.role),
        },
        token: await this.signJWT({
          id: userNew.id,
          name: userNew.name || '',
          lastname: userNew.lastname || '',
          username: userNew.username,
          roles: userNew.roles.map((role) => role.role),
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
    const existingUser = await this.authRepository.findByUsernameWithRoles(
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

    const userRole = existingUser.roles?.[0]?.role;
    if (!userRole) {
      throw new RpcException({
        status: 500,
        message: 'User does not have a role assigned',
      });
    }

    return {
      user: {
        id: existingUser.id,
        name: existingUser.name,
        lastname: existingUser.lastname,
        username: existingUser.username,
        roles: existingUser.roles.map((role) => role.role),
      },
      token: await this.signJWT({
        id: existingUser.id,
        name: existingUser.name || '',
        lastname: existingUser.lastname || '',
        username: existingUser.username,
        roles: existingUser.roles.map((role) => role.role),
      }),
    };
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
