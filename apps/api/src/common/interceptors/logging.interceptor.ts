/**
 * LoggingInterceptor
 * ---------------------------------------------------------------------------
 * Registra cada request HTTP con: método, URL, status y duración total.
 * Sirve como traza mínima de auditoría y diagnóstico.
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const elapsed = Date.now() - start;
        this.logger.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${elapsed}ms`);
      }),
    );
  }
}
