/**
 * UsersModule
 * ---------------------------------------------------------------------------
 * Expone UsersService al resto de la aplicación. UsersController queda
 * registrado para los endpoints /users/me.
 */

import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
