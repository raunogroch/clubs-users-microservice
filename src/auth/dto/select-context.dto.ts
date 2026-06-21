import { IsString, IsNotEmpty, IsEnum, ValidateIf } from 'class-validator';
import { Roles } from '../../common';

export class SelectContextDto {
  // assignmentId is required only for roles that are not SUPER_ADMIN or ADMIN
  @ValidateIf(
    (obj) => obj.role && ![Roles.SUPER_ADMIN, Roles.ADMIN].includes(obj.role),
  )
  @IsString({ message: 'assignmentId must be a string' })
  @IsNotEmpty({ message: 'assignmentId is required for this role' })
  assignmentId?: string;

  @IsEnum(Roles, {
    message: `Role must be one of: ${Object.values(Roles).join(', ')}`,
  })
  @IsNotEmpty({ message: 'role is required' })
  role!: Roles;

  @IsString()
  @IsNotEmpty({ message: 'userId is required' })
  userId!: string;
}
