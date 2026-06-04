/**
 * BookingPolicy
 * ===========================================================================
 * Constantes que codifican las REGLAS DE NEGOCIO del subsistema de reservas.
 *
 * Justificación académica:
 * Al aislar la política en un módulo dedicado se cumple el principio de
 * Single Responsibility (cada constante representa un invariante del
 * dominio) y se facilita la documentación: el evaluador puede citar este
 * archivo como "Especificación de reglas operativas" en el informe.
 *
 * REFERENCIA INFORME - Capítulo 4: Diseño del Sistema
 * Sección: Reglas de negocio y políticas operativas
 *
 * Convenciones:
 *  - Los usuarios con rol ADMIN están exentos de TODAS estas reglas: pueden
 *    crear/cancelar/reprogramar en cualquier momento.
 *  - Los mensajes de error van en español, listos para mostrarse al cliente.
 */

export const BOOKING_POLICY = {
  /**
   * Anticipación máxima permitida para reservar.
   * Evita que un usuario "trabe" la agenda lejana.
   */
  MAX_DAYS_AHEAD: 30,

  /**
   * Anticipación mínima al horario de inicio para reservar.
   * Da margen al complejo para preparar la cancha y al sistema para enviar
   * las notificaciones pertinentes.
   */
  MIN_HOURS_BEFORE_START_TO_BOOK: 2,

  /**
   * Plazo mínimo antes del inicio para cancelar. Pasado ese plazo se asume
   * que el complejo ya organizó el slot y la cancelación queda bloqueada.
   */
  MIN_HOURS_BEFORE_START_TO_CANCEL: 4,

  /**
   * Cantidad máxima de reservas FUTURAS activas (CONFIRMED o PENDING) que
   * puede tener un mismo usuario simultáneamente.
   */
  MAX_ACTIVE_RESERVATIONS_PER_USER: 3,
} as const;

/**
 * Devuelve cuántas horas faltan para `target` desde "ahora".
 * Útil para los chequeos de la política sin duplicar el cálculo.
 */
export function hoursFromNow(target: Date): number {
  return (target.getTime() - Date.now()) / (3600 * 1000);
}

/**
 * Devuelve cuántos días calendario (en milisegundos) hay entre "ahora" y
 * `target`. Se usa para validar la anticipación máxima.
 */
export function daysFromNow(target: Date): number {
  return (target.getTime() - Date.now()) / (24 * 3600 * 1000);
}
