/**
 * AuditController
 *  - GET /audit-logs → listado paginado (ADMIN).
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth('access-token')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Listar últimas acciones registradas (ADMIN).' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items por página (default 50).' })
  @ApiQuery({ name: 'skip', required: false, description: 'Offset (default 0).' })
  @ApiQuery({ name: 'resource', required: false, description: 'Filtrar por recurso.' })
  list(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('resource') resource?: string,
  ) {
    return this.audit.list({
      limit: limit ? Number(limit) : undefined,
      skip: skip ? Number(skip) : undefined,
      resource,
    });
  }
}
