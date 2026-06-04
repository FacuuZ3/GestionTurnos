/**
 * Configuración de la documentación OpenAPI (Swagger).
 * ---------------------------------------------------------------------------
 * Genera la especificación a partir de los decoradores @ApiOperation /
 * @ApiProperty del código y la sirve en /api/docs.
 *
 * REFERENCIA INFORME - Capítulo 5: Implementación
 * Sección: Documentación de la API
 * Diagrama relacionado: Contrato OpenAPI (anexo del informe)
 * Descripción académica: La generación automática de un contrato OpenAPI
 *   permite a evaluadores y desarrolladores externos explorar y probar la
 *   API sin necesidad de leer el código fuente.
 */

import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Pádel Turnos API')
    .setDescription(
      'Backend del Sistema Integral de Gestión y Reserva de Turnos para ' +
        'Complejos Deportivos de Pádel. Proyecto Final TUP - UTN FRRq.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token JWT obtenido en POST /auth/login',
      },
      'access-token',
    )
    .addTag('auth', 'Registro, login, verificación y refresh de tokens.')
    .addTag('users', 'Perfil del usuario autenticado.')
    .addTag('courts', 'Gestión de canchas (ADMIN).')
    .addTag('reservations', 'Disponibilidad y reserva de turnos.')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
