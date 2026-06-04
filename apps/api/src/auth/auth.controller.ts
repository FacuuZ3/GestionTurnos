/**
 * AuthController
 * ---------------------------------------------------------------------------
 * Endpoints HTTP del subsistema de autenticación.
 *
 *  - POST /auth/register       → crear usuario y disparar email de verificación.
 *  - GET  /auth/verify-email   → activar cuenta con token.
 *  - POST /auth/login          → emitir { accessToken, refreshToken, user }.
 *  - POST /auth/refresh        → renovar tokens a partir de un refresh válido.
 *  - GET  /auth/me             → devolver el usuario autenticado.
 *
 * REFERENCIA INFORME - Capítulo 4: Diseño del Sistema
 * Sección: Subsistema de Autenticación / API Pública
 * Diagrama relacionado: Diagrama de Casos de Uso - Registro / Login
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar nuevo usuario y enviar email de verificación.' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Cuenta creada; revisar email.' })
  @ApiResponse({ status: 409, description: 'Ya existe una cuenta con ese email.' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Get('verify-email')
  @ApiOperation({ summary: 'Activar la cuenta con el token enviado por email.' })
  @ApiQuery({ name: 'token', required: true, description: 'Token de verificación recibido por email.' })
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión. Devuelve accessToken + refreshToken + user.' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Tokens emitidos.' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas o cuenta no verificada.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar tokens a partir de un refresh token válido.' })
  @ApiBody({ type: RefreshTokenDto })
  refresh(@Body() _dto: RefreshTokenDto, @CurrentUser() user: AuthUser) {
    return this.authService.refresh(user.id);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicitar email con enlace para restablecer la contraseña.',
    description:
      'Por seguridad, la respuesta es la misma exista o no la cuenta. Esto ' +
      'evita la enumeración de emails registrados.',
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aplicar una nueva contraseña con el token recibido.' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @ApiBearerAuth('access-token')
  @Get('me')
  @ApiOperation({ summary: 'Datos del usuario autenticado (decodificados del access token).' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
