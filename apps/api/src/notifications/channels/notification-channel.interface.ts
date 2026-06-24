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

/** Archivo adjunto de una notificación (p. ej. un PDF de reporte). */
export interface NotificationAttachment {
  /** Nombre del archivo tal como lo verá el destinatario. */
  filename: string;
  /** Contenido binario del adjunto. */
  content: Buffer;
  /** MIME type (default 'application/octet-stream' en el canal). */
  contentType?: string;
}

export interface NotificationPayload {
  /** Destinatario principal (email, número de teléfono, deviceId, etc.). */
  to: string;
  /** Asunto / título del mensaje. */
  subject: string;
  /** Cuerpo plano. */
  text: string;
  /** Cuerpo HTML opcional (para canales que lo soporten). */
  html?: string;
  /** Adjuntos opcionales (los canales que no los soporten los ignoran). */
  attachments?: NotificationAttachment[];
}

export interface INotificationChannel {
  /** Identificador único del canal (p. ej. 'email', 'whatsapp'). */
  readonly name: string;
  /** Envía la notificación a través del canal concreto. */
  send(payload: NotificationPayload): Promise<void>;
}
