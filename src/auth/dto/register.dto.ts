import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
} from 'class-validator';
import { Roles, Status } from '../../common';

export class RegisterDto {
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name should not be empty' })
  name!: string;

  @IsString({ message: 'lastname must be a string' })
  @IsNotEmpty({ message: 'lastname should not be empty' })
  lastname!: string;

  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  username!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password must be at least 8 characters long and include uppercase, lowercase, number, and symbol',
    },
  )
  password!: string;

  @IsOptional()
  @IsEnum(Status, {
    message: `Status must be one of: ${Object.values(Status).join(', ')}`,
  })
  status?: Status;

  @IsOptional()
  @IsArray()
  @IsEnum(Roles, {
    each: true,
    message: `Roles must be one of: ${Object.values(Roles).join(', ')}`,
  })
  roles?: Roles[];
}
