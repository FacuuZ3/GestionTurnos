/**
 * NotificationsService
 * ---------------------------------------------------------------------------
 * Fachada del subsistema de notificaciones. Mantiene la lista de canales
 * disponibles y delega el envío al canal solicitado.
 *
 * Métodos de alto nivel:
 *  - sendVerificationEmail(...)   → enviar mail de verificación de cuenta.
 *  - sendReservationConfirmed(...) → enviar mail de turno confirmado.
 *  - sendReservationCancelled(...) → enviar mail de turno cancelado.
 *
 * REFERENCIA INFORME - Capítulo 4: Diseño del Sistema
 * Sección: Patrón Strategy y desacople por eventos
 * Diagrama relacionado: Diagrama de Clases - Notificaciones
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailChannel } from './channels/email.channel';
import { INotificationChannel, NotificationPayload } from './channels/notification-channel.interface';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly channels: Map<string, INotificationChannel> = new Map();

  constructor(
    private readonly config: ConfigService,
    private readonly emailChannel: EmailChannel,
  ) {
    // Registro inicial de canales disponibles. La extensión a WhatsApp solo
    // requiere instanciar WhatsAppChannel y agregarlo aquí.
    this.channels.set(this.emailChannel.name, this.emailChannel);
  }

  private async dispatch(channel: string, payload: NotificationPayload): Promise<void> {
    const target = this.channels.get(channel);
    if (!target) {
      this.logger.warn(`Canal de notificación desconocido: ${channel}`);
      return;
    }
    await target.send(payload);
  }

  /** Envía el email de verificación con el link al frontend. */
  async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    const link = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

    await this.dispatch('email', {
      to,
      subject: 'Verificá tu cuenta — Pádel Turnos',
      text:
        `Hola ${name},\n\n` +
        `Te damos la bienvenida a Pádel Turnos. ` +
        `Para activar tu cuenta hacé clic en el siguiente enlace:\n${link}\n\n` +
        `Si no creaste esta cuenta, ignorá este mensaje.`,
      html:
        `<p>Hola <strong>${name}</strong>,</p>` +
        `<p>Te damos la bienvenida a <strong>Pádel Turnos</strong>. ` +
        `Para activar tu cuenta hacé clic en el botón:</p>` +
        `<p><a href="${link}" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Verificar mi cuenta</a></p>` +
        `<p>O copiá este enlace en el navegador:<br/><code>${link}</code></p>` +
        `<p>Si no creaste esta cuenta, podés ignorar este mensaje.</p>`,
    });
  }

  /** Notifica al usuario que su turno fue confirmado. */
  async sendReservationConfirmed(
    to: string,
    name: string,
    courtName: string,
    startTime: Date,
  ): Promise<void> {
    const when = startTime.toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' });
    await this.dispatch('email', {
      to,
      subject: 'Turno confirmado — Pádel Turnos',
      text:
        `Hola ${name},\n\n` +
        `Tu turno en ${courtName} fue confirmado para ${when}.\n` +
        `El pago se realiza en el complejo al momento de jugar.\n` +
        `¡Te esperamos!`,
    });
  }

  /**
   * Envía el email con el link de reseteo de contraseña.
   * El token caduca en el plazo definido por AuthService (1 hora típicamente).
   */
  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    const link = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await this.dispatch('email', {
      to,
      subject: 'Restablecé tu contraseña — Pádel Turnos',
      text:
        `Hola ${name},\n\n` +
        `Recibimos una solicitud para cambiar tu contraseña. ` +
        `Si fuiste vos, ingresá al siguiente enlace para definir una nueva:\n${link}\n\n` +
        `El enlace caduca en 1 hora. Si no solicitaste este cambio, ignorá este mensaje.`,
      html:
        `<p>Hola <strong>${name}</strong>,</p>` +
        `<p>Recibimos una solicitud para cambiar tu contraseña. Si fuiste vos, ` +
        `definí la nueva clave desde el siguiente botón:</p>` +
        `<p><a href="${link}" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Cambiar contraseña</a></p>` +
        `<p>O copiá este enlace en tu navegador:<br/><code>${link}</code></p>` +
        `<p>El enlace caduca en 1 hora. Si no solicitaste el cambio, podés ignorar este mensaje.</p>`,
    });
  }

  /**
   * Notifica al usuario que su turno arranca en aproximadamente 24 hs.
   * Llamado por ReminderService desde un cron job horario.
   */
  async sendReservationReminder(
    to: string,
    name: string,
    courtName: string,
    startTime: Date,
  ): Promise<void> {
    const when = startTime.toLocaleString('es-AR', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    await this.dispatch('email', {
      to,
      subject: 'Recordatorio: tu turno es mañana — Pádel Turnos',
      text:
        `Hola ${name},\n\n` +
        `Te recordamos que tenés reservado un turno en ${courtName} para ${when}.\n` +
        `Si por algún motivo no podés asistir, podés cancelarlo desde el panel ` +
        `de "Mi panel" (hasta 4 hs antes del inicio).\n\n` +
        `¡Te esperamos!`,
    });
  }

  /** Notifica al usuario que su turno fue cancelado. */
  async sendReservationCancelled(
    to: string,
    name: string,
    courtName: string,
    startTime: Date,
  ): Promise<void> {
    const when = startTime.toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' });
    await this.dispatch('email', {
      to,
      subject: 'Turno cancelado — Pádel Turnos',
      text:
        `Hola ${name},\n\nTu turno en ${courtName} del ${when} ha sido cancelado.\n` +
        `Si tenés dudas, contactá al complejo.`,
    });
  }

  /**
   * Envía a un admin el reporte de reservas en PDF como archivo adjunto.
   * @param to       email destinatario (el admin que solicitó el reporte).
   * @param pdf      contenido del PDF ya generado (Buffer).
   * @param filename nombre del archivo adjunto.
   * @param summary  resumen legible de los filtros aplicados (va en el cuerpo).
   */
  async sendReservationsReport(
    to: string,
    pdf: Buffer,
    filename: string,
    summary: string,
  ): Promise<void> {
    await this.dispatch('email', {
      to,
      subject: 'Reporte de reservas — Pádel Turnos',
      text:
        `Adjuntamos el reporte de reservas solicitado.\n\n` +
        `${summary}\n\n` +
        `El archivo "${filename}" contiene el detalle en formato PDF.`,
      attachments: [{ filename, content: pdf, contentType: 'application/pdf' }],
    });
  }
}
