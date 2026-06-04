/**
 * ClubInfoController
 *  - GET   /club-info   → público: datos institucionales del complejo.
 *  - PATCH /club-info   → ADMIN: editar datos.
 */

import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ClubInfoService } from './club-info.service';
import { UpdateClubInfoDto } from './dto/update-club-info.dto';

@ApiTags('club-info')
@Controller('club-info')
export class ClubInfoController {
  constructor(private readonly service: ClubInfoService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Información pública del club (público).' })
  get() {
    return this.service.get();
  }

  @ApiBearerAuth('access-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch()
  @ApiOperation({ summary: 'Actualizar información del club (ADMIN).' })
  update(@Body() dto: UpdateClubInfoDto) {
    return this.service.update(dto);
  }
}
