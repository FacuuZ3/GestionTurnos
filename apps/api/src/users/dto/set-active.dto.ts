/**
 * SetActiveDto: payload de PATCH /users/:id/active (ADMIN).
 * Activa o desactiva (borrado lógico) la cuenta de un usuario.
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetActiveDto {
  @ApiProperty({ example: false, description: 'true = activa la cuenta; false = la desactiva.' })
  @IsBoolean({ message: 'isActive debe ser booleano.' })
  isActive!: boolean;
}
