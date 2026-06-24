/**
 * ReservationsReportService
 * ---------------------------------------------------------------------------
 * Genera un PDF tabular con el listado de reservas filtrado, en memoria
 * (devuelve un Buffer). Se reutiliza tanto para la descarga directa
 * (GET /reservations/report.pdf) como para el envío por email
 * (POST /reservations/report/email).
 *
 * Usa PDFKit, que escribe el documento como un stream; acumulamos los chunks
 * y los concatenamos en un único Buffer al cerrar el documento.
 *
 * REFERENCIA INFORME - Capítulo 5: Implementación
 * Sección: Reportes y exportación de datos
 */

import { Injectable } from '@nestjs/common';
import { Prisma, ReservationStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';

/** Reserva con cancha y usuario incluidos (lo que necesita el reporte). */
export type ReservationForReport = Prisma.ReservationGetPayload<{
  include: { court: true; user: true };
}>;

/** Filtros aplicados, para imprimirlos en el encabezado del reporte. */
export interface ReportFilters {
  date?: string;
  courtName?: string;
  status?: ReservationStatus;
}

const STATUS_LABEL: Record<ReservationStatus, string> = {
  CONFIRMED: 'Confirmada',
  PENDING: 'Pendiente',
  CANCELLED: 'Cancelada',
};

// Posiciones X de cada columna (A4, márgenes de 40pt).
const COLS = {
  fecha: { x: 40, w: 130 },
  cancha: { x: 172, w: 88 },
  usuario: { x: 262, w: 108 },
  email: { x: 372, w: 130 },
  estado: { x: 504, w: 55 },
};

@Injectable()
export class ReservationsReportService {
  /** Construye el resumen legible de filtros (también se usa en el email). */
  buildSummary(filters: ReportFilters, total: number): string {
    const parts: string[] = [];
    parts.push(`Fecha: ${filters.date ?? 'todas'}`);
    parts.push(`Cancha: ${filters.courtName ?? 'todas'}`);
    parts.push(`Estado: ${filters.status ? STATUS_LABEL[filters.status] : 'todos'}`);
    parts.push(`Total de registros: ${total}`);
    return parts.join('  ·  ');
  }

  /** Genera el PDF y lo devuelve como Buffer. */
  generate(reservations: ReservationForReport[], filters: ReportFilters): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];

    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    // --- Encabezado ---------------------------------------------------------
    doc.fontSize(18).font('Helvetica-Bold').text('Reporte de reservas', { align: 'left' });
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#666')
      .text(`Generado: ${new Date().toLocaleString('es-AR')}`)
      .text(this.buildSummary(filters, reservations.length))
      .fillColor('#000');
    doc.moveDown(1);

    // --- Cabecera de la tabla ----------------------------------------------
    const headerY = doc.y;
    doc.fontSize(9).font('Helvetica-Bold');
    this.row(doc, headerY, {
      fecha: 'Fecha / Hora',
      cancha: 'Cancha',
      usuario: 'Usuario',
      email: 'Email',
      estado: 'Estado',
    });
    doc
      .moveTo(COLS.fecha.x, headerY + 14)
      .lineTo(COLS.estado.x + COLS.estado.w, headerY + 14)
      .strokeColor('#ccc')
      .stroke()
      .strokeColor('#000');

    // --- Filas --------------------------------------------------------------
    doc.font('Helvetica').fontSize(8);
    let y = headerY + 20;
    const bottom = doc.page.height - 50;

    if (reservations.length === 0) {
      doc.fillColor('#666').text('No hay reservas para los filtros seleccionados.', COLS.fecha.x, y);
      doc.fillColor('#000');
    }

    for (const r of reservations) {
      if (y > bottom) {
        doc.addPage();
        y = 50;
      }
      this.row(doc, y, {
        fecha: r.startTime.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }),
        cancha: r.court.name,
        usuario: r.user.name,
        email: r.user.email,
        estado: STATUS_LABEL[r.status],
      });
      y += 18;
    }

    doc.end();
    return done;
  }

  /** Dibuja una fila con las 5 columnas a una altura `y` dada. */
  private row(
    doc: PDFKit.PDFDocument,
    y: number,
    cells: { fecha: string; cancha: string; usuario: string; email: string; estado: string },
  ): void {
    doc.text(cells.fecha, COLS.fecha.x, y, { width: COLS.fecha.w, ellipsis: true });
    doc.text(cells.cancha, COLS.cancha.x, y, { width: COLS.cancha.w, ellipsis: true });
    doc.text(cells.usuario, COLS.usuario.x, y, { width: COLS.usuario.w, ellipsis: true });
    doc.text(cells.email, COLS.email.x, y, { width: COLS.email.w, ellipsis: true });
    doc.text(cells.estado, COLS.estado.x, y, { width: COLS.estado.w, ellipsis: true });
  }
}
