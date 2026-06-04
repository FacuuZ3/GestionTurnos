/**
 * RecurringReservationsController
 * ---------------------------------------------------------------------------
 *  - GET    /recurring-reservations         → listar (cualquier autenticado).
 *  - POST   /recurring-reservations         → crear  (ADMIN).
 *  - DELETE /recurring-reservations/:id     → suspender (ADMIN).
 *
 * El GET se abre a cualquier usuario autenticado porque los bloqueos fijos
 * forman parte de la "agenda pública" del complejo (similar a la lista de
 * canchas): cualquier cliente debe poder verlos para entender qué horarios
 * están permanentemente ocupados. Las operaciones de escritura (POST,
 * DELETE) siguen restringidas a ADMIN.
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
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
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RecurringReservationsService } from './recurring-reservations.service';
import { CreateRecurringReservationDto } from './dto/create-recurring.dto';

@ApiTags('recurring-reservations')
@ApiBearerAuth('access-token')
@Controller('recurring-reservations')
export class RecurringReservationsController {
  constructor(private readonly service: RecurringReservationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar turnos fijos activos (cualquier autenticado).' })
  @ApiQuery({ name: 'courtId', required: false, description: 'Filtrar por cancha.' })
  list(@Query('courtId') courtId?: string) {
    return this.service.list(courtId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Crear un turno fijo semanal (ADMIN).' })
  create(@Body() dto: CreateRecurringReservationDto) {
    return this.service.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Suspender un turno fijo (soft delete, ADMIN).' })
  @ApiParam({ name: 'id', format: 'uuid' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.softDelete(id);
  }
}
