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
  Res,
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
import { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { ReservationsService } from './reservations.service';
import { ReservationsReportService, ReportFilters } from './reservations-report.service';
import { ReminderService } from './reminder.service';
import { StatsService } from './stats.service';
import { CourtsService } from '../courts/courts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { AvailabilityQueryDto } from './dto/availability.dto';
import { RescheduleReservationDto } from './dto/reschedule.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { StatsQueryDto } from './dto/stats-query.dto';
import { ReportQueryDto } from './dto/report-query.dto';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(
    private readonly reservations: ReservationsService,
    private readonly reminderService: ReminderService,
    private readonly statsService: StatsService,
    private readonly reportService: ReservationsReportService,
    private readonly courtsService: CourtsService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Reúne las reservas filtradas, resuelve el nombre de la cancha (para el
   * encabezado) y genera el PDF. Reutilizado por la descarga y el envío.
   */
  private async buildReport(
    query: ReportQueryDto,
  ): Promise<{ pdf: Buffer; filename: string; summary: string; records: number }> {
    const reservations = await this.reservations.listForReport(query);

    let courtName: string | undefined;
    if (query.courtId) {
      courtName =
        reservations[0]?.court.name ??
        (await this.courtsService.findByIdOrThrow(query.courtId)).name;
    }

    const filters: ReportFilters = { date: query.date, courtName, status: query.status };
    const pdf = await this.reportService.generate(reservations, filters);
    const summary = this.reportService.buildSummary(filters, reservations.length);
    const filename = `reservas-${query.date ?? 'todas'}.pdf`;
    return { pdf, filename, summary, records: reservations.length };
  }

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

  // NOTA: las rutas de reporte usan paths estáticos ('report.pdf', 'report/email')
  // y se declaran antes que cualquier ruta paramétrica para evitar colisiones.

  @ApiBearerAuth('access-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('report.pdf')
  @ApiOperation({ summary: 'Descargar el reporte de reservas filtrado en PDF (ADMIN).' })
  async downloadReport(
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const { pdf, filename } = await this.buildReport(query);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdf.length.toString(),
    });
    res.end(pdf);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('report/email')
  @ApiOperation({
    summary:
      'Generar el reporte de reservas filtrado y enviarlo por email al admin (ADMIN).',
  })
  async emailReport(@Query() query: ReportQueryDto, @CurrentUser() user: AuthUser) {
    const { pdf, filename, summary, records } = await this.buildReport(query);
    await this.notifications.sendReservationsReport(user.email, pdf, filename, summary);
    return { message: `Reporte enviado a ${user.email}.`, records };
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
