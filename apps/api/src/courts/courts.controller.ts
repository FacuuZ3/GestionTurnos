/**
 * CourtsController
 * ---------------------------------------------------------------------------
 * Endpoints de gestión de canchas.
 *
 *  - GET    /courts        → público: lista de canchas activas.
 *  - POST   /courts        → ADMIN:  crear cancha.
 *  - PATCH  /courts/:id    → ADMIN:  editar.
 *  - DELETE /courts/:id    → ADMIN:  soft delete.
 */

import {
  Body,
  Controller,
  Delete,
  Get,
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
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CourtsService } from './courts.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';

@ApiTags('courts')
@Controller('courts')
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar canchas activas (público).' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  list(@Query('includeInactive') includeInactive?: string) {
    return this.courtsService.list(includeInactive === 'true');
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Obtener una cancha por id.' })
  @ApiParam({ name: 'id', format: 'uuid' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.courtsService.findByIdOrThrow(id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Crear una cancha (ADMIN).' })
  create(@Body() dto: CreateCourtDto) {
    return this.courtsService.create(dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar parcialmente una cancha (ADMIN).' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateCourtDto) {
    return this.courtsService.update(id, dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Suspender una cancha (soft delete, ADMIN).' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.courtsService.softDelete(id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id/permanent')
  @ApiOperation({
    summary:
      'Eliminar definitivamente una cancha (ADMIN). Sólo se permite si ya ' +
      'fue suspendida y no tiene reservas asociadas en el histórico.',
  })
  permanentDelete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.courtsService.hardDelete(id);
  }
}
