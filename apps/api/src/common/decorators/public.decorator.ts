/**
 * @Public(): marca un endpoint como accesible sin autenticación.
 * El JwtAuthGuard verifica esta metadata y omite la validación del token.
 */

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
