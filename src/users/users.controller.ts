import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UploadImageDto,
  UploadDniDto,
  UpdateStatusDto,
  UpdatePasswordDto,
} from './dto';
import { PaginationDto, Roles } from '../common';
import type { UserRoleValidation } from './interfaces';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern('users.create')
  create(@Payload() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @MessagePattern('users.find_all')
  findAll(@Payload() paginationDto: PaginationDto) {
    return this.usersService.findAll(paginationDto);
  }

  @MessagePattern('users.find_one')
  findOne(@Payload('id') id: string) {
    return this.usersService.findOne(id);
  }

  @MessagePattern('users.update')
  update(
    @Payload()
    updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(updateUserDto.id, updateUserDto);
  }

  @MessagePattern('users.delete')
  remove(@Payload() id: string) {
    return this.usersService.remove(id);
  }

  @MessagePattern('users.upload_image')
  uploadImage(@Payload() uploadImageDto: UploadImageDto) {
    return this.usersService.uploadImage(uploadImageDto);
  }

  @MessagePattern('users.upload_dni')
  uploadDni(@Payload() uploadDniDto: UploadDniDto) {
    return this.usersService.uploadDni(uploadDniDto);
  }

  @MessagePattern('users.update_status')
  changeStatus(@Payload() updateStatusDto: UpdateStatusDto) {
    return this.usersService.changeStatus(updateStatusDto.id, updateStatusDto);
  }

  @MessagePattern('users.update_password')
  updatePassword(@Payload() updatePasswordDto: UpdatePasswordDto) {
    return this.usersService.updatePassword(
      updatePasswordDto.id,
      updatePasswordDto,
    );
  }

  @MessagePattern('users.admin.validate')
  validateUser(@Payload() data: UserRoleValidation) {
    return this.usersService.validateAdmins(data);
  }

  @MessagePattern('users.adding.assignment')
  addingAssignment(
    @Payload()
    data: {
      userId: string;
      assignmentId: string;
      role: Roles;
    },
  ) {
    return this.usersService.addingAssignment(data);
  }

  @MessagePattern('users.remove.assignment')
  removeAssignment(
    @Payload()
    data: {
      userId: string;
      assignmentId: string;
      role: Roles;
    },
  ) {
    return this.usersService.removeAssignment(data);
  }
}
