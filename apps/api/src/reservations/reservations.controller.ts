/**
 * ReservationsController
 * ---------------------------------------------------------------------------
 *  - GET   /reservations/availability       (público) → slots del día.
 *  - GET   /reservations/me                          → reservas del usuario.
 *  - GET   /reservations                  (ADMIN)    → listado filtrado.
 *  - POST  /reservations                             → crear (transaccional).
 *  - PATCH /reservations/:id/cancel                  → cancelar.
 *  - PATCH /reservations/:id/status       (ADMIN)    → cambiar estado.
 *  - PATCH /reservations/:id/reschedule   (ADMIN)    → mover turno.
 */

import {
  Body,
  Controller,
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { ReservationsService } from './reservations.service';
import { ReminderService } from './reminder.service';
import { StatsService } from './stats.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { AvailabilityQueryDto } from './dto/availability.dto';
import { RescheduleReservationDto } from './dto/reschedule.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { StatsQueryDto } from './dto/stats-query.dto';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(
    private readonly reservations: ReservationsService,
    private readonly reminderService: ReminderService,
    private readonly statsService: StatsService,
  ) {}

  @Public()
  @Get('availability')
  @ApiOperation({ summary: 'Obtener disponibilidad de slots para una cancha en un día.' })
  availability(@Query() query: AvailabilityQueryDto) {
    return this.reservations.getAvailability(query.courtId, query.date);
  }

  @ApiBearerAuth('access-token')
  @Get('me')
  @ApiOperation({ summary: 'Reservas del usuario autenticado.' })
  mine(@CurrentUser() user: AuthUser) {
    return this.reservations.listMine(user.id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Listar reservas filtrando por día y/o cancha (ADMIN).' })
  @ApiQuery({ name: 'date', required: false, type: String, example: '2026-05-21' })
  @ApiQuery({ name: 'courtId', required: false, type: String, description: 'UUID de la cancha.' })
  listAdmin(@Query('date') date?: string, @Query('courtId') courtId?: string) {
    return this.reservations.listAdmin({ date, courtId });
  }

  @ApiBearerAuth('access-token')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post()
  @ApiOperation({
    summary: 'Crear una reserva (transacción serializable con retry SSI).',
    description:
      'Endpoint crítico: corre dentro de prisma.$transaction con nivel ' +
      'Serializable. Verifica solapamiento con SELECT ... FOR UPDATE y ' +
      'reintenta hasta 3 veces ante errores 40001 / P2034.',
  })
  @ApiResponse({ status: 201, description: 'Reserva creada.' })
  @ApiResponse({ status: 409, description: 'El horario solicitado se solapa con otra reserva.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReservationDto) {
    return this.reservations.create(user, dto);
  }

  @ApiBearerAuth('access-token')
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar una reserva (dueño o ADMIN).' })
  @ApiParam({ name: 'id', format: 'uuid' })
  cancel(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.reservations.cancel(user, id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar el estado de una reserva (ADMIN).' })
  changeStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.reservations.changeStatus(id, dto.status);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/reschedule')
  @ApiOperation({ summary: 'Reprogramar una reserva (ADMIN).' })
  reschedule(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RescheduleReservationDto,
  ) {
    return this.reservations.reschedule(id, dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('stats')
  @ApiOperation({
    summary: 'Métricas agregadas para el dashboard administrativo (ADMIN).',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Ventana en días: 7, 30 o 90 (default 30).',
  })
  stats(@Query() query: StatsQueryDto) {
    return this.statsService.getStats(query.days);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('run-reminders')
  @ApiOperation({
    summary:
      'Disparar manualmente el envío de recordatorios (ADMIN). El cron lo ' +
      'hace cada hora; este endpoint sirve para demos o pruebas inmediatas.',
  })
  async runReminders() {
    const sent = await this.reminderService.runOnce();
    return { sent };
  }
}
