/**
 * CourtsModule
 * ---------------------------------------------------------------------------
 * Agrupa controller + service de canchas y exporta CourtsService para que
 * ReservationsService pueda consultarlo sin duplicar acceso a Prisma.
 */

import { Module } from '@nestjs/common';
import { CourtsController } from './courts.controller';
import { CourtsService } from './courts.service';

@Module({
  controllers: [CourtsController],
  providers: [CourtsService],
  exports: [CourtsService],
})
export class CourtsModule {}
