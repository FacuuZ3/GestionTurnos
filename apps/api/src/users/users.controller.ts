/**
 * UsersController
 * ---------------------------------------------------------------------------
 *  - GET   /users/me                   → perfil completo del usuario actual.
 *  - PATCH /users/me                   → editar nombre / teléfono.
 *  - POST  /users/me/change-password   → cambiar contraseña validando la actual.
 */

import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

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
}
