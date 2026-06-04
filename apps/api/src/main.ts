/**
 * main.ts - Bootstrap de la aplicación NestJS.
 * ---------------------------------------------------------------------------
 * Configura el pipeline de middleware global, los filtros y los interceptors:
 *  - Helmet:                      headers HTTP seguros.
 *  - CORS:                        restringido al frontend configurado.
 *  - ValidationPipe global:       valida y transforma DTOs con class-validator.
 *  - GlobalExceptionFilter:       formato uniforme de errores.
 *  - LoggingInterceptor:          traza de todas las requests.
 *  - Prefijo global '/api':       expone la API bajo /api para facilitar el
 *                                 reverse proxy del frontend.
 *
 * REFERENCIA INFORME - Capítulo 5: Implementación
 * Sección: Configuración de middleware y bootstrap
 */

import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { setupSwagger } from './config/swagger.config';
import { buildLoggerOptions } from './config/logger.config';

async function bootstrap(): Promise<void> {
  // Logger Winston se setea antes de NestFactory para capturar incluso los
  // logs del bootstrap interno de Nest.
  const env = process.env.NODE_ENV ?? 'development';
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(buildLoggerOptions(env)),
  });
  const logger = new Logger('Bootstrap');
  const config = app.get(ConfigService);

  // Prefijo de la API para evitar choques con rutas del frontend.
  app.setGlobalPrefix('api');

  // Helmet: cabeceras de seguridad recomendadas (XSS, sniffing, etc.).
  app.use(helmet());

  // CORS: solo el frontend declarado, con credenciales.
  app.enableCors({
    origin: config.getOrThrow<string>('FRONTEND_URL'),
    credentials: true,
  });

  // Validación global de DTOs.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,                 // descarta propiedades no declaradas.
      forbidNonWhitelisted: true,      // 400 si llegan propiedades extra.
      transform: true,                 // habilita class-transformer.
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger: documentación interactiva en /api/docs.
  setupSwagger(app);

  const port = Number(config.get<number>('PORT') ?? 3001);
  await app.listen(port);

  // Reflector no se utiliza directamente aquí, pero se inyecta a guards globales.
  void Reflector;

  logger.log(`API escuchando en http://localhost:${port}/api`);
  logger.log(`Swagger UI disponible en http://localhost:${port}/api/docs`);
}

bootstrap();
