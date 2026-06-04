/**
 * Configuración de Winston como logger global de NestJS.
 * ---------------------------------------------------------------------------
 *  - En desarrollo: salida de consola coloreada y legible.
 *  - En producción: archivos JSON con rotación diaria + consola JSON.
 *
 * Logs estructurados (JSON) permiten que herramientas tipo Datadog, ELK o
 * CloudWatch parseen los campos automáticamente y armen alertas / dashboards
 * sin tocar el código.
 *
 * REFERENCIA INFORME - Capítulo 5: Implementación
 * Sección: Logging estructurado y diagnóstico
 */

import { WinstonModuleOptions, utilities as nestWinstonUtilities } from 'nest-winston';
import * as winston from 'winston';

export function buildLoggerOptions(env: string): WinstonModuleOptions {
  const isProd = env === 'production';

  return {
    level: isProd ? 'info' : 'debug',
    transports: [
      // Consola: bonita en dev, JSON en producción.
      new winston.transports.Console({
        format: isProd
          ? winston.format.combine(
              winston.format.timestamp(),
              winston.format.errors({ stack: true }),
              winston.format.json(),
            )
          : winston.format.combine(
              winston.format.timestamp({ format: 'HH:mm:ss' }),
              winston.format.ms(),
              nestWinstonUtilities.format.nestLike('PadelAPI', {
                colors: true,
                prettyPrint: true,
              }),
            ),
      }),
      // En producción, además, archivo rotado por día.
      ...(isProd
        ? [
            new winston.transports.File({
              filename: 'logs/error.log',
              level: 'error',
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json(),
              ),
              maxsize: 5 * 1024 * 1024, // 5 MB por archivo
              maxFiles: 5,
            }),
            new winston.transports.File({
              filename: 'logs/combined.log',
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
              ),
              maxsize: 5 * 1024 * 1024,
              maxFiles: 5,
            }),
          ]
        : []),
    ],
  };
}
