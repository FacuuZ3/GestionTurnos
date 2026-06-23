/**
 * SetRoleDto: payload de PATCH /users/:id/role (ADMIN).
 * Permite promover un USER a ADMIN o degradar un ADMIN a USER.
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class SetRoleDto {
  @ApiProperty({ enum: Role, example: Role.ADMIN })
  @IsEnum(Role, { message: 'Rol inválido (USER o ADMIN).' })
  role!: Role;
}
