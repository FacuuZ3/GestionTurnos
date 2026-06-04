/**
 * GlobalExceptionFilter
 * ---------------------------------------------------------------------------
 * Captura todas las excepciones del sistema y emite una respuesta JSON
 * uniforme:
 *   { statusCode, message, timestamp, path }
 *
 * Mantiene el detalle de HttpException tal como fue arrojado y degrada a
 * 500 INTERNAL_SERVER_ERROR para excepciones no controladas, registrando
 * la traza con el Logger interno.
 *
 * REFERENCIA INFORME - Capítulo 5: Implementación
 * Sección: Manejo centralizado de errores
 * Diagrama relacionado: Diagrama de Componentes - Capa transversal
 */

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp: string;
  path: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // Mensaje: respeta el formato de class-validator (array de strings) si existe.
    let message: string | string[] = 'Error interno del servidor.';
    let error: string | undefined;

    if (isHttp) {
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        message = payload;
      } else if (typeof payload === 'object' && payload !== null) {
        const obj = payload as { message?: string | string[]; error?: string };
        if (obj.message) message = obj.message;
        if (obj.error) error = obj.error;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Errores 5xx: registramos la traza completa para investigación.
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorBody = {
      statusCode: status,
      message,
      ...(error ? { error } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(body);
  }
}
