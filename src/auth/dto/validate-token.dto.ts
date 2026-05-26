import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  token!: string;
}
