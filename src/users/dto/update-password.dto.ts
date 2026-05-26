import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsStrongPassword,
} from 'class-validator';

export class UpdatePasswordDto {
  @IsString({ message: 'ID debe ser un string' })
  @IsNotEmpty({ message: 'ID es requerido' })
  id!: string;

  @IsString({ message: 'newPassword must be a string' })
  @IsNotEmpty({ message: 'newPassword should not be empty' })
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
        'New password must contain at least one uppercase letter, one lowercase letter, one number, and one symbol',
    },
  )
  password!: string;
}
