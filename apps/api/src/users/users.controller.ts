/**
 * UsersController
 * ---------------------------------------------------------------------------
 *  - GET   /users/me                   → perfil completo del usuario actual.
 *  - PATCH /users/me                   → editar nombre / teléfono.
 *  - POST  /users/me/change-password   → cambiar contraseña validando la actual.
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SetRoleDto } from './dto/set-role.dto';
import { SetActiveDto } from './dto/set-active.dto';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Perfil completo del usuario autenticado.' })
  async me(@CurrentUser() current: AuthUser) {
    const user = await this.usersService.findByIdOrThrow(current.id);
    const { password, emailVerifyToken, passwordResetToken, ...safe } = user;
    return safe;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Editar datos del perfil propio (nombre, teléfono).' })
  async update(@CurrentUser() current: AuthUser, @Body() dto: UpdateProfileDto) {
    const user = await this.usersService.updateProfile(current.id, dto);
    const { password, emailVerifyToken, passwordResetToken, ...safe } = user;
    return safe;
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar la contraseña validando la actual.' })
  changePassword(
    @CurrentUser() current: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(current.id, dto.currentPassword, dto.newPassword);
  }

  // -------------------------------------------------------------------------
  // Gestión administrativa de usuarios (ADMIN)
  // -------------------------------------------------------------------------

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Listar usuarios con filtros opcionales (ADMIN).' })
  @ApiQuery({ name: 'role', required: false, enum: Role })
  @ApiQuery({ name: 'search', required: false, description: 'Nombre o email.' })
  list(@Query('role') role?: Role, @Query('search') search?: string) {
    return this.usersService.listAll({ role, search });
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/role')
  @ApiOperation({ summary: 'Cambiar el rol de un usuario (ADMIN).' })
  @ApiParam({ name: 'id', format: 'uuid' })
  setRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SetRoleDto,
    @CurrentUser() current: AuthUser,
  ) {
    return this.usersService.setRole(id, dto.role, current.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/active')
  @ApiOperation({ summary: 'Activar o desactivar una cuenta — borrado lógico (ADMIN).' })
  @ApiParam({ name: 'id', format: 'uuid' })
  setActive(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SetActiveDto,
    @CurrentUser() current: AuthUser,
  ) {
    return this.usersService.setActive(id, dto.isActive, current.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un usuario sin reservas asociadas (ADMIN).' })
  @ApiParam({ name: 'id', format: 'uuid' })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() current: AuthUser,
  ) {
    return this.usersService.adminDelete(id, current.id);
  }
}
