/**
 * INotificationChannel
 * ---------------------------------------------------------------------------
 * Contrato común para todos los canales de notificación (email, WhatsApp,
 * push, SMS, etc.). Permite extender el sistema sin modificar el código
 * existente (Open/Closed Principle).
 *
 * REFERENCIA INFORME - Capítulo 4: Diseño del Sistema
 * Sección: Patrón Strategy aplicado a canales de notificación
 * Diagrama relacionado: Diagrama de Clases - Notificaciones
 */

export interface NotificationPayload {
  /** Destinatario principal (email, número de teléfono, deviceId, etc.). */
  to: string;
  /** Asunto / título del mensaje. */
  subject: string;
  /** Cuerpo plano. */
  text: string;
  /** Cuerpo HTML opcional (para canales que lo soporten). */
  html?: string;
}

export interface INotificationChannel {
  /** Identificador único del canal (p. ej. 'email', 'whatsapp'). */
  readonly name: string;
  /** Envía la notificación a través del canal concreto. */
  send(payload: NotificationPayload): Promise<void>;
}
