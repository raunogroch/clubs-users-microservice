import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { Status } from '../../common';

export class UpdateStatusDto {
  @IsString({ message: 'ID debe ser un string' })
  @IsNotEmpty({ message: 'ID es requerido' })
  id!: string;

  @IsString({ message: 'status debe ser un string' })
  @IsEnum(Status, {
    message: `status debe ser uno de los siguientes valores: ${Object.values(Status).join(', ')}`,
  })
  @IsNotEmpty({ message: 'status es requerido' })
  status!: Status;
}
