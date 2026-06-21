import {
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Gender, Roles, Status } from '../../common';
import { MembershipDto } from './membership.dto';

export class CreateUserDto {
  @IsString({ message: 'username must be a string' })
  @IsNotEmpty({ message: 'username should not be empty' })
  username!: string;

  @IsString({ message: 'password must be a string' })
  @IsNotEmpty({ message: 'password should not be empty' })
  password!: string;

  @IsOptional()
  @IsString({ message: 'name must be a string' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'lastname must be a string' })
  lastname?: string;

  @IsOptional()
  @IsString({ message: 'dni must be a string' })
  @MinLength(6, { message: 'dni must be at least 6 characters long' })
  dni?: string;

  @IsOptional()
  @IsEnum(Gender, {
    message: `gender must be a valid enum value: ${Object.values(Gender).join(', ')}`,
  })
  gender?: Gender;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'birthDate must be a valid date' })
  birthDate?: Date;

  @IsOptional()
  @IsString({ message: 'phone must be a string' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'address must be a string' })
  address?: string;

  @IsOptional()
  @IsEnum(Status, {
    message: `status must be a valid enum value: ${Object.values(Status).join(', ')}`,
  })
  status?: Status;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MembershipDto)
  memberships?: MembershipDto[];
}
