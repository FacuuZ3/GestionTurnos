/**
 * WhatsAppChannel — STUB.
 * ---------------------------------------------------------------------------
 * Implementación pendiente mediante Twilio o Meta Cloud API.
 * Se documenta como trabajo futuro en las Conclusiones del informe.
 *
 * Mantiene la firma de INotificationChannel para que la integración futura
 * solo requiera registrarlo en NotificationsService sin tocar el resto del
 * sistema (Open/Closed Principle).
 */

import { Injectable, Logger } from '@nestjs/common';
import { INotificationChannel, NotificationPayload } from './notification-channel.interface';

@Injectable()
export class WhatsAppChannel implements INotificationChannel {
  readonly name = 'whatsapp';
  private readonly logger = new Logger(WhatsAppChannel.name);

  async send(payload: NotificationPayload): Promise<void> {
    // TODO (trabajo futuro): integrar Twilio / Meta Cloud API.
    this.logger.debug(`[WHATSAPP-STUB] → ${payload.to}: ${payload.subject}`);
  }
}
